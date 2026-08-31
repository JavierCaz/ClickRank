import { NextRequest, NextResponse } from "next/server";

import {
  VISITOR_COOKIE_MAX_AGE,
  VISITOR_COOKIE_NAME,
  getClientIp,
  hashIp,
  resolveVisitorId,
} from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { instagramProfileUrl } from "@/lib/username";

export const dynamic = "force-dynamic";

/**
 * GET /go/[username]
 *
 * The single entry point for clicking a profile:
 *
 *   1. Look up the (normalized) username.
 *   2. Resolve the anonymous visitor id (cookie, minted if missing).
 *   3. Atomically attempt to record a valid click. The database's EXCLUDE
 *      constraint rejects duplicates for the same (visitor, profile) within
 *      24h — no SELECT-then-INSERT race, no client-trusted state.
 *   4. Set the visitor cookie and 302-redirect to the Instagram profile.
 *
 * The redirect always happens, even when the click is a repeat (the visitor
 * still gets to Instagram; only the leaderboard count is unaffected).
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/go/[username]">
) {
  const { username } = await ctx.params;
  const normalized = username.trim().toLowerCase();

  if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
    // Malformed username — bounce to the home page.
    return NextResponse.redirect(new URL("/", request.url));
  }

  const admin = getSupabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, instagram_username")
    .eq("instagram_username", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // --- Anti-abuse: resolve visitor identity --------------------------------
  const visitorId = resolveVisitorId(request.cookies.get(VISITOR_COOKIE_NAME)?.value);
  const visitorHash = hashIp(getClientIp(request.headers));

  // --- Atomically record the click (duplicates rejected by DB constraint) --
  const { error: insertError } = await admin.from("clicks").insert({
    profile_id: profile.id,
    visitor_id: visitorId,
    visitor_hash: visitorHash,
  });

  if (insertError) {
    const code = insertError.code;
    const isDuplicate =
      code === "23P01" || // exclusion_violation (24h cooldown)
      code === "23505"; // unique_violation (belt & braces)

    if (!isDuplicate) {
      // Real server-side failure: log and redirect anyway rather than fail
      // the visitor's navigation.
      console.error("[clickrank] failed to record click:", insertError.message);
    }
  }

  // --- Redirect with a (possibly freshly minted) visitor cookie ------------
  const target = instagramProfileUrl(profile.instagram_username);
  const response = NextResponse.redirect(target, 302);

  response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/",
  });

  // Keep this handler from being prerendered/cached by anything.
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
/** A visitor that clears cookies could spam the /go route; keep a new id. */
export const revalidate = 0;

