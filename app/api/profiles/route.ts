import { NextRequest, NextResponse } from "next/server";

import { isAvatarEmoji } from "@/lib/avatar";
import { getClientIp, hashIp } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizeInstagramUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

/** Max profile submissions per IP per rolling hour. */
const SUBMISSION_RATE_LIMIT = 10;
const SUBMISSION_WINDOW_HOURS = 1;

interface SubmitBody {
  username?: unknown;
  displayName?: unknown;
  avatarEmoji?: unknown;
}

/**
 * POST /api/profiles
 *
 * Server-side profile submission. Validates + normalizes the Instagram
 * username, rate-limits by hashed IP, rejects duplicates, and inserts the
 * profile with the service-role client. The client cannot write directly.
 *
 * Error strings are user-facing (rendered by the submit form) and kept in
 * Spanish; the site UI is Spanish-only.
 */
export async function POST(request: NextRequest) {
  const ipHash = hashIp(getClientIp(request.headers));
  const admin = getSupabaseAdmin();

  // --- Rate limit (lightweight, best-effort) --------------------------------
  const hourAgo = new Date(Date.now() - SUBMISSION_WINDOW_HOURS * 60 * 60 * 1000);

  const { count, error: countError } = await admin
    .from("submission_events")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", hourAgo.toISOString());

  if (countError) {
    console.error("[clickrank] rate-limit check failed:", countError.message);
  } else if ((count ?? 0) >= SUBMISSION_RATE_LIMIT) {
    return NextResponse.json(
      { error: "Demasiados envíos. Inténtalo más tarde." },
      { status: 429 }
    );
  }

  // --- Parse + validate body -------------------------------------------------
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json(
      { error: "Solicitud no válida." },
      { status: 400 }
    );
  }

  const parsed = normalizeInstagramUsername(
    typeof body.username === "string" ? body.username : ""
  );

  if (!parsed.ok || !parsed.username) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const username = parsed.username;
  const displayName =
    typeof body.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim().slice(0, 60)
      : null;

  // Avatar emoji is optional but must come from the picker whitelist.
  let avatarEmoji: string | null = null;
  if (body.avatarEmoji !== undefined && body.avatarEmoji !== "") {
    if (!isAvatarEmoji(body.avatarEmoji)) {
      return NextResponse.json({ error: "Emoji de avatar no válido." }, { status: 400 });
    }
    avatarEmoji = body.avatarEmoji;
  }

  // --- Record the submission event for rate limiting (post-validation) ------
  await admin.from("submission_events").insert({ ip_hash: ipHash });

  // --- Duplicate check + insert ----------------------------------------------
  // Unique index on lower(username) makes this race-safe: if two requests
  // arrive concurrently, only one insert wins; the other hits 23505.
  const { data: profile, error: insertError } = await admin
    .from("profiles")
    .insert({ instagram_username: username, display_name: displayName, avatar_emoji: avatarEmoji })
    .select("id, instagram_username, display_name, avatar_emoji, created_at")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error: `@${username} ya está en ClickRank.`,
          existing: true,
        },
        { status: 409 }
      );
    }
    console.error("[clickrank] profile insert failed:", insertError.message);
    return NextResponse.json(
      { error: "Algo salió mal. Inténtalo de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile }, { status: 201 });
}
