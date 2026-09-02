import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl" aria-hidden="true">
        🤷
      </p>
      <h1 className="text-xl font-bold">Perfil no encontrado</h1>
      <p className="text-sm text-stone-400">
        Ese perfil aún no está en ClickRank.
      </p>
      <div className="flex gap-3">
        <Link
          href="/submit"
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
        >
          Añádelo
        </Link>
        <Link
          href="/"
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold dark:border-stone-700"
        >
          Volver a la clasificación
        </Link>
      </div>
    </main>
  );
}
