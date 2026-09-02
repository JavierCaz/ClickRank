"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

export interface ClickResult {
  ok: boolean;
  duplicate: boolean;
  /** Full cooldown window length in ms (the live DB `click_config` value). */
  cooldownMs: number;
  /** Ms left before this visitor can click this profile again (0 = none). */
  cooldownRemainingMs: number;
}

interface ClickTargetProps {
  username: string;
  className?: string;
  children?: React.ReactNode;
  /** Callback fired the moment a click is attempted (optimistic UI hooks). */
  onClicks?: () => void;
  /** Server verdict after the click attempt: counted or duplicate + cooldown. */
  onResult?: (result: ClickResult) => void;
  /** Optional: render as a full link (semantic) but intercept clicks. */
  asLink?: boolean;
  ariaLabel?: string;
  /**
   * After recording the click, navigate to /go/[username] (which records the
   * click and 302-redirects to the Instagram profile). Defaults to false:
   * the click is recorded via POST /api/clicks/[username] and the visitor
   * stays on the page.
   */
  redirect?: boolean;
}

/**
 * Wraps any element that should trigger the "click a profile" flow.
 *
 * When pressed:
 *   1. Fires a brief "+1" confirmation (optimistic UI).
 *   2. Records the click. By default this happens via POST
 *      /api/clicks/[username] and the visitor stays on the page. With
 *      `redirect`, the visitor instead navigates to /go/[username], where the
 *      server validates anti-abuse rules, records the click and redirects to
 *      the Instagram profile.
 *
 * The actual validity check is server-side; this component shows the brief
 * "+1" confirmation and reports the server verdict through `onResult`
 * (counted or duplicate + remaining cooldown) so callers can render accurate
 * counts and a DB-driven cooldown indicator.
 */
export function ClickTarget({
  username,
  className,
  children,
  onClicks,
  onResult,
  asLink = false,
  ariaLabel,
  redirect = false,
}: ClickTargetProps) {
  const [pulsing, setPulsing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPulsing(true);
      onClicks?.();

      if (redirect) {
        // Brief visual confirmation, then hand off to the server flow.
        // /go/[username] is a server route that 302-redirects to an external
        // Instagram URL; useRouter().push() cannot follow an external
        // redirect, so a full-page navigation is required here.
        timeoutRef.current = setTimeout(() => {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = `/go/${encodeURIComponent(username)}`;
        }, 450);
      } else {
        // Record the click server-side without navigating away. The database
        // atomically rejects duplicates (EXCLUDE constraint) — no
        // SELECT-then-INSERT race. Failures are logged, never surfaced.
        fetch(`/api/clicks/${encodeURIComponent(username)}`, {
          method: "POST",
        })
          .then(async (res) => {
            if (!res.ok) return null;
            try {
              return (await res.json()) as ClickResult;
            } catch {
              return null;
            }
          })
          .then((result) => {
            if (result) onResult?.(result);
        }).catch((err) => {
            console.error("[clickrank] failed to record click:", err);
          });
        // Dismiss the "+1" badge after a short confirmation.
        timeoutRef.current = setTimeout(() => setPulsing(false), 950);
      }
    },
    [username, onClicks, onResult, redirect]
  );

  const commonProps = {
    className,
    "aria-label": ariaLabel ?? `Haz click en @${username} para ayudarle a subir`,
    onClick: handleClick,
  };

  if (asLink) {
    return (
      <Link href={`/go/${encodeURIComponent(username)}`} {...commonProps}>
        {children}
        <PlusOneBadge visible={pulsing} />
      </Link>
    );
  }

  return (
    <button type="button" {...commonProps}>
      {children}
      <PlusOneBadge visible={pulsing} />
    </button>
  );
}

/**
 * The floating "+1" confirmation bubble. Rendered while `pulsing` is true.
 */
export function PlusOneBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span
      aria-hidden="true"
      className="animate-pop-up pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-emerald-500 dark:text-emerald-400"
    >
      +1
    </span>
  );
}
