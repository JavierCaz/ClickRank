"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { AVATAR_EMOJIS } from "@/lib/avatar";

interface SubmitState {
  status: "idle" | "submitting" | "error";
  message?: string;
}

/**
 * Profile submission form.
 *
 * The heavy lifting (validation, normalization, duplicate check, insert) is
 * done server-side in POST /api/profiles. This component only collects input.
 * On success the visitor is sent straight to the leaderboard, where their new
 * profile is live (with a short confirmation banner on the home page).
 */
export function SubmitForm() {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const username = new FormData(form).get("username") as string;
      const displayName = new FormData(form).get("displayName") as string;

      setState({ status: "submitting" });

      try {
        const res = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, displayName, avatarEmoji: avatarEmoji ?? undefined }),
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          setState({ status: "error", message: body.error ?? "Algo salió mal. Inténtalo de nuevo." });
          return;
        }

        // Success — straight to the leaderboard. The `added` query param
        // triggers a one-line confirmation banner on the home page.
        const added = (body.profile?.instagram_username as string | undefined) ?? null;
        router.push(added ? `/?added=${encodeURIComponent(added)}` : "/");
      } catch {
        setState({ status: "error", message: "Error de red. Inténtalo de nuevo." });
      }
    },
    [router, avatarEmoji]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Nombre de usuario de Instagram *</span>
        <input
          type="text"
          name="username"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="@tuusuario"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 dark:border-stone-700 dark:bg-stone-950 dark:placeholder:text-stone-600"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">
          Nombre visible <span className="font-normal text-stone-400">(opcional)</span>
        </span>
        <input
          type="text"
          name="displayName"
          autoComplete="off"
          maxLength={60}
          placeholder="María"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 dark:border-stone-700 dark:bg-stone-950 dark:placeholder:text-stone-600"
        />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-semibold">
          Avatar <span className="font-normal text-stone-400">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-1">
          {AVATAR_EMOJIS.map((emoji) => {
            const selected = avatarEmoji === emoji;
            return (
              <button
                key={emoji}
                type="button"
                aria-pressed={selected}
                aria-label={`Usar ${emoji} como avatar`}
                onClick={() => setAvatarEmoji(selected ? null : emoji)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none transition-all ${
                  selected
                    ? "scale-110 bg-stone-900/5 ring-2 ring-stone-900 dark:bg-white/10 dark:ring-white"
                    : "hover:bg-stone-100 dark:hover:bg-white/10"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-stone-400">
          {avatarEmoji
            ? `Avatar elegido: ${avatarEmoji}`
            : "Sin elegir, asignaremos uno automáticamente según tu nombre de usuario."}
        </p>
      </fieldset>

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={state.status === "submitting"}
        className="mt-1 rounded-full bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-stone-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
      >
        {state.status === "submitting" ? "Añadiendo…" : "Añadir mi perfil"}
      </button>

      <p className="text-center text-xs text-stone-400">
        No necesitas una cuenta. Tu nombre de usuario será público en la
        clasificación.
      </p>
    </form>
  );
}
