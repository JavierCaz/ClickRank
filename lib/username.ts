/**
 * Instagram username validation + normalization.
 *
 * Instagram usernames may contain letters, numbers, periods and underscores,
 * and are 1–30 characters long. We normalize to a canonical lowercase form
 * before storing/comparing so that `@John.Doe` and `johndoe` never create
 * duplicate profiles.
 */

export const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

export const INSTAGRAM_BASE_URL = "https://www.instagram.com";

export interface UsernameResult {
  ok: boolean;
  /** Normalized username (lowercase, stripped of decorations), if ok. */
  username?: string;
  /** Human-readable error message, if not ok. */
  error?: string;
}

/**
 * Normalize raw input into a canonical Instagram username.
 * Accepts:
 *   - "johndoe"
 *   - "@johndoe"
 *   - "https://www.instagram.com/johndoe"   (must be instagram.com)
 *   - "https://instagram.com/johndoe/"
 *
 * Rejects anything that isn't an Instagram URL when a URL is provided, so
 * users can never smuggle arbitrary external redirect URLs through this field.
 */
export function normalizeInstagramUsername(raw: string): UsernameResult {
  const input = (raw ?? "").trim();

  if (!input) {
    return { ok: false, error: "Please enter an Instagram username." };
  }

  let candidate = input;

  // If it looks like a URL, make sure it's an Instagram URL.
  if (/^https?:\/\//i.test(input)) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      return { ok: false, error: "That URL is not valid." };
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "instagram.com") {
      return {
        ok: false,
        error: "Only Instagram profile links are allowed.",
      };
    }

    const path = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!path) {
      return { ok: false, error: "That Instagram link has no username." };
    }
    candidate = path;
  }

  // Strip a leading @ if present.
  candidate = candidate.replace(/^@+/, "").trim();

  if (!INSTAGRAM_USERNAME_REGEX.test(candidate)) {
    return {
      ok: false,
      error:
        "Usernames can only contain letters, numbers, periods and underscores (max 30 characters).",
    };
  }

  const username = candidate.toLowerCase();
  return { ok: true, username };
}

/** Build the canonical Instagram profile URL for a normalized username. */
export function instagramProfileUrl(username: string): string {
  return `${INSTAGRAM_BASE_URL}/${username}/`;
}
