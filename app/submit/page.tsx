import type { Metadata } from "next";
import Link from "next/link";

import { SubmitForm } from "@/components/submit-form";

export const metadata: Metadata = {
  title: "Submit your profile",
  description:
    "Add your Instagram profile to the ClickRank leaderboard and start climbing.",
};

export default function SubmitPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-16 pt-12">
      <header className="text-center">
        <Link
          href="/"
          className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        >
          ← Back to leaderboard
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          Get on the board
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Submit your Instagram profile. Every visitor click pushes you up the
          leaderboard.
        </p>
      </header>

      <SubmitForm />
    </main>
  );
}
