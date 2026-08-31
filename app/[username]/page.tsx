import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { ClickTarget } from "@/components/click-target";
import {
  clicksToOvertake,
  getNextRanked,
  getProfileStats,
} from "@/lib/leaderboard";
import { instagramProfileUrl } from "@/lib/username";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function loadProfile(username: string) {
  const stats = await getProfileStats(username);
  if (!stats) return null;
  const next = await getNextRanked(username);
  return { stats, next };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await loadProfile(username.toLowerCase());
  if (!data) return { title: "Profile not found" };

  const { stats, next } = data;
  const title = `@${stats.instagram_username} is #${stats.rank} on ClickRank with ${stats.total_clicks} ${
    stats.total_clicks === 1 ? "click" : "clicks"
  }.`;
  const description = next
    ? `${title} ${clicksToOvertake(stats.total_clicks, next.clicks)} clicks to overtake @${next.instagram_username}.`
    : title;

  return {
    title: `@${stats.instagram_username} — Rank #${stats.rank}`,
    description,
    openGraph: {
      type: "profile",
      title,
      description,
      url: `/${stats.instagram_username}`,
      username: stats.instagram_username,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const data = await loadProfile(username.toLowerCase());
  if (!data) notFound();

  const { stats, next } = data;
  const overtake = next ? clicksToOvertake(stats.total_clicks, next.clicks) : null;
  const url = instagramProfileUrl(stats.instagram_username);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pb-16 pt-12">
      <Link
        href="/"
        className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
      >
        ← Back to leaderboard
      </Link>

      {/* Profile card */}
      <section className="flex flex-col items-center gap-4 text-center">
        <Avatar
          username={stats.instagram_username}
          displayName={stats.display_name}
          avatarUrl={stats.avatar_url}
          size={96}
          priority
        />
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            @{stats.instagram_username}
          </h1>
          {stats.display_name && (
            <p className="mt-0.5 text-sm text-stone-400">{stats.display_name}</p>
          )}
        </div>

        {/* Rank + clicks */}
        <div className="flex w-full items-stretch gap-3">
          <div className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="font-mono text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">
              #{stats.rank}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-stone-400">
              rank
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="font-mono text-3xl font-black tabular-nums">
              {stats.total_clicks.toLocaleString("en-US")}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-stone-400">
              total clicks
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="font-mono text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.today_clicks.toLocaleString("en-US")}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-stone-400">
              today
            </p>
          </div>
        </div>

        {/* Distance to next rank */}
        {next && overtake !== null && (
          <p className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
            {overtake === 0 ? (
              <>Tied with @{next.instagram_username} — one click puts you ahead!</>
            ) : (
              <>
                <strong>{overtake} clicks</strong> to overtake{" "}
                <strong>@{next.instagram_username}</strong>
              </>
            )}
          </p>
        )}
      </section>

      {/* Primary action: register a click + redirect to Instagram */}
      <section className="flex flex-col gap-3">
        <ClickTarget
          username={stats.instagram_username}
          className="group relative w-full rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.985]"
        >
          Help @{stats.instagram_username} climb ↑
        </ClickTarget>

        <ClickTarget
          username={stats.instagram_username}
          className="group relative w-full rounded-2xl border border-stone-300 bg-white px-6 py-4 text-center text-base font-semibold text-stone-700 transition-all hover:border-stone-400 hover:bg-stone-50 active:scale-[0.985] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          ariaLabel={`Visit @${stats.instagram_username} on Instagram (counts as a click)`}
        >
          Visit Instagram
        </ClickTarget>

        <p className="text-center text-xs text-stone-400">
          Every visit counts as a click (max one per 24 hours) and sends you
          straight to Instagram.
        </p>
      </section>

      <footer className="pt-4 text-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600 dark:hover:text-stone-300"
        >
          {url.replace(/^https?:\/\//, "")}
        </a>
      </footer>
    </main>
  );
}
