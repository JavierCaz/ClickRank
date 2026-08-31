"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { Avatar } from "@/components/avatar";

interface SubmitState {
  status: "idle" | "submitting" | "success" | "error";
  message?: string;
  profile?: {
    id: string;
    instagram_username: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  };
}

/**
 * Profile submission form.
 *
 * The heavy lifting (validation, normalization, duplicate check, insert) is
 * done server-side in POST /api/profiles. This component only collects input
 * and renders the result.
 */
export function SubmitForm() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
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

      setState({ status: "success", profile: body.profile });
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }, []);

  const shareUrl =
    state.profile && typeof window !== "undefined"
      ? `${window.location.origin}/${state.profile.instagram_username}`
      : "";

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — fall back to prompt for manual copy.
      window.prompt("Copy your ClickRank link:", shareUrl);
    }
  }, [shareUrl]);

  // --- Success state --------------------------------------------------------
  if (state.status === "success" && state.profile) {
    return (
      <div className="animate-slide-up flex flex-col items-center gap-5 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-4xl" aria-hidden="true">
          🎉
        </p>
        <h2 className="text-2xl font-black">You&rsquo;re on the board!</h2>
        <Avatar
          username={state.profile.instagram_username}
          displayName={state.profile.display_name}
          avatarUrl={state.profile.avatar_url}
          size={72}
        />
        <p className="text-sm text-stone-600 dark:text-stone-300">
          <span className="font-bold">@{state.profile.instagram_username}</span>{" "}
          is now on ClickRank. Share your page to start collecting clicks.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/${state.profile.instagram_username}`}
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
          >
            View your page
          </Link>
          <button
            type="button"
            onClick={copyShareLink}
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold dark:border-stone-700"
          >
            {copied ? "Copied ✓" : "Copy share link"}
          </button>
        </div>

        <p className="max-w-full truncate font-mono text-xs text-stone-400">
          {shareUrl}
        </p>
      </div>
    );
  }

  // --- Form states ----------------------------------------------------------
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
