import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Database-backed leaderboard queries. All ranking math happens inside
 * Postgres functions (see the migration); we only translate rows here.
 */

export interface LeaderboardEntry {
  id: string;
  instagram_username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_emoji: string | null;
  clicks: number;
  rank: number;
}

export const LEADERBOARD_LIMIT = 100;

/** Raw row shape returned by the get_leaderboard RPC. */
interface LeaderboardRow {
  id: string;
  instagram_username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_emoji: string | null;
  clicks: number | null;
  rank: number | null;
}

/** All-time leaderboard rows, ranked by the database. */
export async function getLeaderboard(
  limit: number = LEADERBOARD_LIMIT
): Promise<LeaderboardEntry[]> {
  const { data, error } = await getSupabaseAdmin().rpc("get_leaderboard", {
    p_period: "all",
    p_limit: limit,
  });

  if (error) throw error;

  const rows = (data ?? []) as unknown as LeaderboardRow[];
  return rows.map((row) => ({
    id: row.id,
    instagram_username: row.instagram_username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    avatar_emoji: row.avatar_emoji,
    clicks: Number(row.clicks ?? 0),
    rank: Number(row.rank),
  }));
}
