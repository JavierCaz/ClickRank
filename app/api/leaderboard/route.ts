import { NextResponse } from "next/server";

import { getLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboard
 *
 * Returns the server-computed ranking for both periods (all-time + today) in a
 * single request. The client leaderboard polls this endpoint every few seconds
 * so the ranking stays live without a page refresh (see
 * components/leaderboard.tsx).
 *
 * The ranking is computed by the Postgres `get_leaderboard` function through
 * the server-only service-role client. Anon/authenticated roles can never
 * EXECUTE that function directly, so this route handler is the browser's only
 * window into it — the security boundary is preserved.
 */
export async function GET() {
  try {
    const [allTime, today] = await Promise.all([
      getLeaderboard("all"),
      getLeaderboard("today"),
    ]);
    return NextResponse.json(
      { all: allTime, today },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(
      "[clickrank] failed to load leaderboard:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "leaderboard_unavailable" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
