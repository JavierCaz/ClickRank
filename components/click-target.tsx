"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

interface ClickTargetProps {
  username: string;
  className?: string;
  children: React.ReactNode;
  /** Callback fired the moment a click is registered (for optimistic counts). */
  onClicks?: () => void;
  /** Optional: render as a full link (semantic) but intercept clicks. */
  asLink?: boolean;
  ariaLabel?: string;
}

/**
 * Wraps any element that should trigger the "click a profile" flow.
 *
 * When pressed:
 *   1. Fires a brief "+1" confirmation (optimistic UI).
 *   2. Immediately navigates to /go/[username], where the server validates
 *      anti-abuse rules, records the click (if valid) and redirects to the
 *      Instagram profile.
 *
 * The actual validity check is server-side; this component only optimistically
 * shows the confirmation. Repeat clicks within 24h still redirect to
 * Instagram — only the recorded count is affected.
 */
export function ClickTarget({
  username,
  className,
  children,
  onClicks,
  asLink = false,
  ariaLabel,
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

      // Brief visual confirmation, then hand off to the server flow.
      timeoutRef.current = setTimeout(() => {
        // /go/[username] is a server route that 302-redirects to an external
        // Instagram URL; useRouter().push() cannot follow an external
        // redirect, so a full-page navigation is required here.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/go/${encodeURIComponent(username)}`;
      }, 450);
    },
    [username, onClicks]
  );

  const commonProps = {
    className,
    "aria-label": ariaLabel ?? `Click @${username} to help them climb`,
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
