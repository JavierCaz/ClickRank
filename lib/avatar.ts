/**
 * Deterministic placeholder avatars.
 *
 * Per requirements: "If possible, automatically retrieve the Instagram
 * profile image only if this can be done reliably without introducing an
 * external API dependency. Otherwise, use a generated avatar/placeholder."
 *
 * Instagram has no reliable public API for this and scraping is fragile, so we
 * render a self-contained SVG avatar: a stable gradient picked from the
 * username plus an emoji (the visitor's own pick, or a deterministic default
 * derived from the username). Zero external calls, privacy-friendly.
 */

const PALETTES: [string, string][] = [
  ["#f59e0b", "#ef4444"], // amber -> red
  ["#8b5cf6", "#ec4899"], // violet -> pink
  ["#06b6d4", "#3b82f6"], // cyan -> blue
  ["#10b981", "#84cc16"], // emerald -> lime
  ["#f97316", "#eab308"], // orange -> yellow
  ["#6366f1", "#14b8a6"], // indigo -> teal
  ["#d946ef", "#8b5cf6"], // fuchsia -> violet
];

/**
 * Emojis offered by the avatar picker. Keep them to single code points (no
 * ZWJ sequences / flags) so they render predictably inside an SVG <text>.
 */
export const AVATAR_EMOJIS = [
  "😀", "😎", "🥳", "🦄", "🦊", "🐼",
  "🐸", "🐙", "🦁", "🐯", "🦉", "🦋",
  "🐢", "🐳", "🦩", "🌵", "🌸", "🍀",
  "🌞", "🌈", "🔥", "🍕", "🎯", "🎮",
  "🎸", "⚽", "🏀", "🎲", "👑", "🎩",
  "🚀", "🛸", "💎", "⚡", "🍩", "🧁",
] as const;

/** True when `value` is one of the picker's emojis. */
export function isAvatarEmoji(value: unknown): value is string {
  return typeof value === "string" && (AVATAR_EMOJIS as readonly string[]).includes(value);
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Pick a stable gradient for a username. */
export function gradientFor(username: string): [string, string] {
  return PALETTES[hashString(username) % PALETTES.length];
}

/** Stable fallback emoji for profiles whose owner never picked one. */
export function defaultEmojiFor(username: string): string {
  return AVATAR_EMOJIS[hashString(username) % AVATAR_EMOJIS.length];
}

/**
 * Build a self-contained SVG data URI avatar: gradient background (stable per
 * username) with an emoji centered on it. No network requests, no external
 * service. `size` is in pixels.
 */
export function avatarDataUri(
  username: string,
  emoji?: string | null,
  size = 128
): string {
  const [from, to] = gradientFor(username);
  const glyph = emoji?.trim() || defaultEmojiFor(username);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-size="${Math.round(size * 0.52)}">${glyph}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
