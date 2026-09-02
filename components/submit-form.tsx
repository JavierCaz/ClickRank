"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

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
          body: JSON.stringify({ username, displayName }),
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          setState({ status: "error", message: body.error ?? "Something went wrong." });
          return;
        }

        // Success — straight to the leaderboard. The `added` query param
        // triggers a one-line confirmation banner on the home page.
        const added = (body.profile?.instagram_username as string | undefined) ?? null;
        router.push(added ? `/?added=${encodeURIComponent(added)}` : "/");
      } catch {
        setState({ status: "error", message: "Network error. Please try again." });
      }
    },
    [router]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Instagram username *</span>
        <input
          type="text"
          name="username"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="@yourusername"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 dark:border-stone-700 dark:bg-stone-950 dark:placeholder:text-stone-600"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">
          Display name <span className="font-normal text-stone-400">(optional)</span>
        </span>
        <input
          type="text"
          name="displayName"
          autoComplete="off"
          maxLength={60}
          placeholder="Maria"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 dark:border-stone-700 dark:bg-stone-950 dark:placeholder:text-stone-600"
        />
      </label>

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
        {state.status === "submitting" ? "Adding…" : "Add my profile"}
      </button>

      <p className="text-center text-xs text-stone-400">
        You don&rsquo;t need an account. Your username will be public on the
        leaderboard.
      </p>
    </form>
  );
}
