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
  clicks: number;
  rank: number;
}

export interface ProfileStats {
  id: string;
  instagram_username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  total_clicks: number;
  today_clicks: number;
  rank: number;
}

export interface NextRanked {
  instagram_username: string;
  clicks: number;
}

export type LeaderboardPeriod = "today" | "all";

export const LEADERBOARD_LIMIT = 100;

/** Raw row shape returned by the get_leaderboard RPC. */
interface LeaderboardRow {
  id: string;
  instagram_username: string;
  display_name: string | null;
  avatar_url: string | null;
  clicks: number | null;
  rank: number | null;
}

/** Raw row shape returned by the get_profile_stats RPC. */
interface ProfileStatsRow {
  id: string;
  instagram_username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  total_clicks: number | null;
  today_clicks: number | null;
  rank: number | null;
}

/** Raw row shape returned by the get_next_ranked RPC. */
interface NextRankedRow {
  instagram_username: string;
  clicks: number | null;
}

/** Leaderboard rows for a given period, ranked by the database. */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  limit: number = LEADERBOARD_LIMIT
): Promise<LeaderboardEntry[]> {
  const { data, error } = await getSupabaseAdmin().rpc("get_leaderboard", {
    p_period: period,
    p_limit: limit,
  });

  if (error) throw error;

  const rows = (data ?? []) as unknown as LeaderboardRow[];
  return rows.map((row) => ({
    id: row.id,
    instagram_username: row.instagram_username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    clicks: Number(row.clicks ?? 0),
    rank: Number(row.rank),
  }));
}

/** Stats for a single profile page. Returns null when the profile is missing. */
export async function getProfileStats(
  username: string
): Promise<ProfileStats | null> {
  const { data, error } = await getSupabaseAdmin().rpc("get_profile_stats", {
    p_username: username,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const row = data[0] as unknown as ProfileStatsRow;
  return {
    id: row.id,
    instagram_username: row.instagram_username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    is_active: row.is_active,
    created_at: row.created_at,
    total_clicks: Number(row.total_clicks ?? 0),
    today_clicks: Number(row.today_clicks ?? 0),
    rank: Number(row.rank),
  };
}

/**
 * The profile ranked immediately above the given one, for the
 * "X clicks to overtake @user" mechanic. Null when already #1.
 */
export async function getNextRanked(
  username: string
): Promise<NextRanked | null> {
  const { data, error } = await getSupabaseAdmin().rpc("get_next_ranked", {
    p_username: username,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const row = data[0] as unknown as NextRankedRow;
  return {
    instagram_username: row.instagram_username,
    clicks: Number(row.clicks ?? 0),
  };
}

/** Clicks needed to overtake the profile above (i.e. surpass its count). */
export function clicksToOvertake(myClicks: number, nextClicks: number): number {
  return Math.max(0, nextClicks - myClicks + 1);
}
