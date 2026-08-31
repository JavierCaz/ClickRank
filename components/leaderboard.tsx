"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/avatar";
import { ClickTarget, PlusOneBadge } from "@/components/click-target";
import type { LeaderboardEntry } from "@/lib/leaderboard";

type Period = "all" | "today";

const MEDALS = ["🥇", "🥈", "🥉"];

interface LeaderboardProps {
  allTime: LeaderboardEntry[];
  today: LeaderboardEntry[];
}

function formatClicks(n: number): string {
  return n.toLocaleString("en-US");
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <span className="text-lg leading-none">{MEDALS[rank - 1]}</span>;
  }
  return (
    <span className="font-mono text-sm font-semibold tabular-nums text-stone-400">
      {rank}
    </span>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const [count, setCount] = useState(entry.clicks);
  const [pulsing, setPulsing] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleOptimistic = () => {
    setCount((c) => c + 1);
    setPulsing(true);
    setFlash(true);
    // Drop the flash class so it can re-trigger on the next click.
    setTimeout(() => setFlash(false), 950);
  };

  const isTop3 = entry.rank <= 3;

  return (
    <ClickTarget
      username={entry.instagram_username}
      onClicks={handleOptimistic}
      className={`group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.985] sm:gap-4 sm:px-4 ${
        isTop3
          ? "border-stone-200 bg-gradient-to-r from-amber-50 via-white to-white dark:border-stone-800 dark:from-stone-900 dark:via-stone-950 dark:to-stone-950"
          : "border-stone-100 bg-white hover:border-stone-200 hover:bg-stone-50 dark:border-stone-900 dark:bg-stone-950 dark:hover:border-stone-800 dark:hover:bg-stone-900/60"
      } ${flash ? "animate-row-flash" : ""}`}
      ariaLabel={`Click @${entry.instagram_username} to help them climb the leaderboard`}
    >
      <div className="flex w-8 shrink-0 justify-center">
        <RankBadge rank={entry.rank} />
      </div>

      <Avatar
        username={entry.instagram_username}
        displayName={entry.display_name}
        avatarUrl={entry.avatar_url}
        size={40}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-stone-900 dark:text-stone-100">
          @{entry.instagram_username}
        </p>
        {entry.display_name ? (
          <p className="truncate text-xs text-stone-400">{entry.display_name}</p>
        ) : (
          <p className="truncate text-xs text-stone-400">
            Click to help them climb ↑
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`font-mono text-lg font-bold tabular-nums ${
            isTop3 ? "text-amber-600 dark:text-amber-400" : "text-stone-800 dark:text-stone-200"
          }`}
        >
          {formatClicks(count)}
        </p>
        <p className="text-[11px] uppercase tracking-wide text-stone-400">
          clicks
        </p>
      </div>

      <PlusOneBadge visible={pulsing} />
    </ClickTarget>
  );
}

export function Leaderboard({ allTime, today }: LeaderboardProps) {
  const [period, setPeriod] = useState<Period>("all");

  const entries = useMemo(
    () => (period === "all" ? allTime : today),
    [period, allTime, today]
  );

  return (
    <div className="w-full">
      {/* Period toggle */}
      <div className="mb-4 flex items-center justify-center">
        <div
          role="tablist"
          aria-label="Leaderboard period"
          className="inline-flex rounded-full border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900"
        >
          {(
            [
              ["all", "All Time"],
              ["today", "Today"],
            ] as [Period, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={period === key}
              onClick={() => setPeriod(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                period === key
                  ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center dark:border-stone-800 dark:bg-stone-950">
          <p className="text-lg font-semibold text-stone-700 dark:text-stone-300">
            No clicks yet {period === "today" ? "today" : ""}
          </p>
          <p className="mt-1 text-sm text-stone-400">
            Be the first to submit a profile and get clicking.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="animate-slide-up">
              <Row entry={entry} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
