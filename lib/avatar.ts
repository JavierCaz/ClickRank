

/**
 * Deterministic placeholder avatars.
 *
 * Per requirements: "If possible, automatically retrieve the Instagram
 * profile image only if this can be done reliably without introducing an
 * external API dependency. Otherwise, use a generated avatar/placeholder."
 *
 * Instagram has no reliable public API for this and scraping is fragile, so
 * we generate a deterministic gradient SVG avatar from the username — stable
 * across renders, zero external calls, privacy-friendly.
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

/** Stable initials for a username (up to 2 chars, uppercased). */
export function initialsFor(username: string, displayName?: string | null): string {
  const source = displayName?.trim() || username;
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Build a self-contained SVG data URI avatar. No network requests, no
 * external service. `size` is in pixels.
 */
export function avatarDataUri(username: string, displayName: string | null, size = 128): string {
  const [from, to] = gradientFor(username);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="-apple-system, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="${Math.round(size * 0.42)}" fill="rgba(255,255,255,0.95)">${initialsFor(username, displayName)}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
