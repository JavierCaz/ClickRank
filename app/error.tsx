"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[clickrank] page error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl" aria-hidden="true">
        😵
      </p>
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-stone-400">
        We couldn&rsquo;t load the leaderboard. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold dark:border-stone-700"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
