import { NextRequest, NextResponse } from "next/server";

import {
  VISITOR_COOKIE_MAX_AGE,
  VISITOR_COOKIE_NAME,
  getClientIp,
  hashIp,
  resolveVisitorId,
} from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/clicks/[username]
 *
 * Records a valid click for a profile WITHOUT redirecting — the leaderboard
 * "+1" flow. Same anti-abuse logic as GET /go/[username] (visitor cookie,
 * hashed IP, atomic EXCLUDE-constraint dedupe in the DB), but returns JSON so
 * the client can stay on the page.
 *
 * The database atomically rejects duplicates for the same (visitor, profile)
 * within the rolling cooldown window (see click_config) — no SELECT-then-INSERT
 * race, no client-trusted state. A repeat click returns 200 with
 * `duplicate: true` and is a silent no-op.
 *
 * Both responses echo the cooldown window (full length + remaining ms) read
 * back from the DB, so the UI can show a countdown that always matches the
 * live `click_config` value.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/clicks/[username]">
) {
  const { username } = await ctx.params;
  const normalized = username.trim().toLowerCase();

  if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
    return NextResponse.json(
      { ok: false, error: "invalid_username" },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("instagram_username", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // --- Anti-abuse: resolve visitor identity --------------------------------
  const visitorId = resolveVisitorId(
    request.cookies.get(VISITOR_COOKIE_NAME)?.value
  );
  const visitorHash = hashIp(getClientIp(request.headers));

  // --- Atomically record the click (duplicates rejected by DB constraint) --
  // `.select()` returns the row Postgres actually inserted, including the
  // `valid_until` the DB computed from `click_cooldown()` (live config).
  const { data: inserted, error: insertError } = await admin
    .from("clicks")
    .insert({
      profile_id: profile.id,
      visitor_id: visitorId,
      visitor_hash: visitorHash,
    })
    .select("created_at, valid_until")
    .maybeSingle();

  let duplicate = false;
  let cooldownMs = 0; // full window length from DB `click_config`
  let cooldownRemainingMs = 0; // ms left before this visitor may click again

  if (insertError) {
    const code = insertError.code;
    duplicate = code === "23P01" || code === "23505"; // exclusion / unique
    if (!duplicate) {
      // Real server-side failure: log and stay silent on the client.
      console.error("[clickrank] failed to record click:", insertError.message);
    }
  } else if (inserted?.created_at && inserted.valid_until) {
    cooldownMs = Math.max(
      0,
      new Date(inserted.valid_until).getTime() -
        new Date(inserted.created_at).getTime()
    );
    cooldownRemainingMs = Math.max(
      0,
      new Date(inserted.valid_until).getTime() - Date.now()
    );
  }

  if (duplicate) {
    // The click was rejected, so read the blocking window back from the DB
    // (single source of truth) to tell the UI exactly how long is left.
    const { data: active } = await admin
      .from("clicks")
      .select("created_at, valid_until")
      .eq("profile_id", profile.id)
      .eq("visitor_id", visitorId)
      .gt("valid_until", new Date().toISOString())
      .order("valid_until", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (active?.created_at && active.valid_until) {
      cooldownMs = Math.max(
        0,
        new Date(active.valid_until).getTime() -
          new Date(active.created_at).getTime()
      );
      cooldownRemainingMs = Math.max(
        0,
        new Date(active.valid_until).getTime() - Date.now()
      );
    }
  }

  // --- Respond with a (possibly freshly minted) visitor cookie -------------
  const response = NextResponse.json(
    { ok: true, duplicate, cooldownMs, cooldownRemainingMs },
    { status: duplicate ? 200 : 201 }
  );

  response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
