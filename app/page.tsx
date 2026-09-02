import type { Metadata } from "next";
import Link from "next/link";

import { Leaderboard } from "@/components/leaderboard";
import { getLeaderboard } from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "ClickRank — Who's the most clickable person on Instagram?",
  description:
    "Submit your Instagram profile and climb the leaderboard. Every click counts — more clicks, higher rank.",
  openGraph: {
    title: "ClickRank",
    description:
      "Who's the most clickable person on Instagram? Click a profile. Help them climb the leaderboard.",
  },
};

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ added?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // The submit flow redirects here with ?added=<username> after a successful
  // insert, so the new profile owner gets a confirmation on arrival.
  const { added } = await searchParams;

  // Fetch both periods server-side; the client toggle switches instantly.
  const [allTime, today] = await Promise.all([
    getLeaderboard("all"),
    getLeaderboard("today"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 pb-16 pt-10 sm:pt-14">
      {/* Logo + tagline */}
      <header className="text-center">
        <Link href="/" className="inline-block" aria-label="ClickRank home">
          <span className="inline-flex items-center gap-2 text-3xl font-black tracking-tight sm:text-4xl">
            <span aria-hidden="true">👆</span>
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              ClickRank
            </span>
          </span>
        </Link>
        <p className="mt-3 text-lg font-medium text-stone-700 dark:text-stone-300">
          Who&rsquo;s the most clickable person on Instagram?
        </p>
        <p className="mt-1 text-sm text-stone-400">
          Click a profile. Help them climb the leaderboard.
        </p>
      </header>

      {/* Just-added confirmation, shown after a successful submit */}
      {added && (
        <div className="flex justify-center">
          <p
            role="status"
            className="animate-slide-up inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <span aria-hidden="true">🎉</span>
            @{added} is on the board!
          </p>
        </div>
      )}

      {/* Submit CTA */}
      <div className="flex justify-center">
        <Link
          href="/submit"
          className="group inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-stone-700 hover:shadow-md active:scale-[0.98] dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
        >
          <span aria-hidden="true">＋</span>
          Submit your Instagram profile
        </Link>
      </div>

      {/* Leaderboard */}
      <section aria-label="Leaderboard" className="mt-2">
        <Leaderboard allTime={allTime} today={today} />
      </section>

      <footer className="pt-4 text-center text-xs text-stone-400">
        <p>
          One valid click per profile, per visitor — rapid repeat clicks don&rsquo;t count.{" "}
          <Link href="/submit" className="underline underline-offset-2 hover:text-stone-600">
            Add your profile
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
