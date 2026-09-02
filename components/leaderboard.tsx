"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/avatar";
import { ClickTarget, type ClickResult } from "@/components/click-target";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { instagramProfileUrl } from "@/lib/username";

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

type CooldownState = {
  /** Whether the last attempt was blocked by the cooldown (vs counted). */
  duplicate: boolean;
  /** Epoch ms when the current window ends (the DB row's valid_until). */
  until: number;
  /** Full window length in ms (the live DB `click_config` value). */
  totalMs: number;
};

/**
 * Live cooldown indicator shown while a (visitor, profile) window is active:
 * a countdown pill plus a progress bar that drains as the window expires.
 * All timing comes from the DB (valid_until / window length) — never a
 * hardcoded duration — so tuning `click_config` is reflected automatically.
 */
function CooldownNotice({ state }: { state: CooldownState }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [state.until]);

  const remainingMs = Math.max(0, state.until - now);
  if (remainingMs <= 0) return null;

  const seconds = Math.ceil(remainingMs / 1000);
  const pct = state.totalMs > 0 ? (remainingMs / state.totalMs) * 100 : 100;
  const blocked = state.duplicate;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center"
    >
      <p
        className={`mb-1.5 max-w-[90%] truncate rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur ${
          blocked
            ? "border-amber-200 bg-amber-50/90 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/80 dark:text-amber-300"
            : "border-emerald-200 bg-emerald-50/90 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-300"
        }`}
      >
        {blocked ? "Already helped —" : "Click counted —"} next click in {seconds}s
      </p>
      <div className="h-1 w-full overflow-hidden rounded-b-2xl bg-stone-900/5 dark:bg-white/10">
        <div
          className={`h-full transition-[width] duration-150 ease-linear ${
            blocked ? "bg-amber-400" : "bg-emerald-500/80"
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const [count, setCount] = useState(entry.clicks);
  const [flash, setFlash] = useState(false);
  const [cooldown, setCooldown] = useState<CooldownState | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Called with the server verdict after each click attempt. The count only
  // moves when the DB actually recorded the click (no optimistic inflation on
  // duplicate clicks), and the cooldown state comes straight from the DB
  // window so the UI always matches the live `click_config` value.
  const handleResult = (result: ClickResult) => {
    if (!result.duplicate) {
      setCount((c) => c + 1);
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 950);
    }

    if (result.cooldownMs > 0 && result.cooldownRemainingMs > 0) {
      setCooldown({
        duplicate: result.duplicate,
        until: Date.now() + result.cooldownRemainingMs,
        totalMs: result.cooldownMs,
      });
    } else {
      setCooldown(null);
    }
  };

  const isTop3 = entry.rank <= 3;

  return (
    <div
      className={`relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.985] sm:gap-4 sm:px-4 ${
        isTop3
          ? "border-stone-200 bg-gradient-to-r from-amber-50 via-white to-white dark:border-stone-800 dark:from-stone-900 dark:via-stone-950 dark:to-stone-950"
          : "border-stone-100 bg-white hover:border-stone-200 hover:bg-stone-50 dark:border-stone-900 dark:bg-stone-950 dark:hover:border-stone-800 dark:hover:bg-stone-900/60"
      } ${flash ? "animate-row-flash" : ""}`}
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

      {/* Name + icon open the profile in a new tab; the rest of the row is
          covered by an invisible +1 button (below). */}
      <div className="pointer-events-none relative z-10 min-w-0 flex-1">
        <Link
          href={instagramProfileUrl(entry.instagram_username)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open @${entry.instagram_username} on Instagram in a new tab`}
          className="group pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-md transition-colors hover:text-stone-700 dark:hover:text-stone-200"
        >
          <span className="truncate text-[15px] font-semibold text-stone-900 underline-offset-4 group-hover:underline dark:text-stone-100">
            @{entry.instagram_username}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 shrink-0 text-stone-400 transition-colors group-hover:text-stone-600 dark:text-stone-500 dark:group-hover:text-stone-300"
          >
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
        </Link>
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

      {/* Invisible full-card button: clicking anywhere on the row (except the
          name link above it) records a click and keeps you on the page. */}
      <ClickTarget
        username={entry.instagram_username}
        onResult={handleResult}
        className="absolute inset-0 rounded-2xl"
        ariaLabel={`Click @${entry.instagram_username} to help them climb the leaderboard`}
      />

      {/* DB-driven cooldown indicator (visible while a window is active). */}
      {cooldown ? <CooldownNotice state={cooldown} /> : null}
    </div>
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
