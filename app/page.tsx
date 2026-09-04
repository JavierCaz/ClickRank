import type { Metadata } from "next";
import Link from "next/link";

import { Leaderboard } from "@/components/leaderboard";
import { getLeaderboard } from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "ClickRank — ¿Quién es la persona más clickeable de Instagram?",
  description:
    "Agrega tu perfil de Instagram y sube en la clasificación. Cada click cuenta: más clicks, más arriba.",
  openGraph: {
    title: "ClickRank",
    description:
      "¿Quién es la persona más clickeable de Instagram? Haz click en un perfil y ayúdale a subir en la clasificación.",
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

  // Fetch the all-time ranking server-side; the client leaderboard keeps it
  // live from there on via /api/leaderboard polling.
  const entries = await getLeaderboard();

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
          ¿Quién es la persona más clickeable de Instagram?
        </p>
        <p className="mt-1 text-sm text-stone-400">
          Haz click en un perfil. Ayúdale a subir en la clasificación.
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
            ¡@{added} ya está en la clasificación!
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
          Agrega tu perfil de Instagram
        </Link>
      </div>

      {/* Leaderboard */}
      <section aria-label="Clasificación" className="mt-2">
        <Leaderboard entries={entries} />
      </section>

      <footer className="pt-4 text-center text-xs text-stone-400">
        <p>
          Un click válido por perfil y por visitante: los clicks seguidos no cuentan.{" "}
          <Link href="/submit" className="underline underline-offset-2 hover:text-stone-600">
            Añade tu perfil
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
