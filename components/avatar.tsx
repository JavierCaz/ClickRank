import Image from "next/image";

import { avatarDataUri } from "@/lib/avatar";

interface AvatarProps {
  username: string;
  avatarUrl?: string | null;
  /** Visitor-picked emoji; falls back to a deterministic one per username. */
  avatarEmoji?: string | null;
  size?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Profile avatar. Uses the stored avatar_url when available (future-proof),
 * otherwise a deterministic generated gradient + emoji — no external API calls.
 */
export function Avatar({
  username,
  avatarUrl,
  avatarEmoji,
  size = 44,
  className = "",
  priority = false,
}: AvatarProps) {
  const fallback = avatarDataUri(username, avatarEmoji ?? null, size * 2);

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`@${username}`}
        width={size}
        height={size}
        priority={priority}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fallback}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
