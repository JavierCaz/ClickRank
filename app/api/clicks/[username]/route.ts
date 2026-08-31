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
 * within 24h — no SELECT-then-INSERT race, no client-trusted state. A repeat
 * click returns 200 with `duplicate: true` and is a silent no-op.
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
  const { error: insertError } = await admin.from("clicks").insert({
    profile_id: profile.id,
    visitor_id: visitorId,
    visitor_hash: visitorHash,
  });

  let duplicate = false;
  if (insertError) {
    const code = insertError.code;
    duplicate = code === "23P01" || code === "23505"; // exclusion / unique
    if (!duplicate) {
      // Real server-side failure: log and stay silent on the client.
      console.error("[clickrank] failed to record click:", insertError.message);
    }
  }

  // --- Respond with a (possibly freshly minted) visitor cookie -------------
  const response = NextResponse.json(
    { ok: true, duplicate },
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
