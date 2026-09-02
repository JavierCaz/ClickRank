import "server-only";

import crypto from "node:crypto";

/**
 * Anti-abuse primitives. Everything here runs server-side only.
 *
 * Threat model: a visitor can generate at most one valid click for the same
 * profile within a rolling cooldown window. Visitors may click different
 * profiles freely and may return to a profile after the cooldown.
 *
 * We identify a visitor by:
 *   1. An anonymous visitor id stored in a cookie (HttpOnly, 1 year).
 *   2. A salted HMAC hash of their IP address (never stored raw).
 *
 * The cooldown window itself is enforced atomically in the database via an
 * EXCLUDE constraint (see the migrations) — not by application logic — so
 * concurrent click/back/click races cannot bypass it. The window length is
 * stored in `click_config` and is tunable at runtime with a single UPDATE.
 */

export const VISITOR_COOKIE_NAME = "cr_visitor";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Generate a fresh anonymous visitor id (cryptographically random UUIDv4). */
export function newVisitorId(): string {
  return crypto.randomUUID();
}

/** Validate that a cookie value is a well-formed UUID we issued. */
export function isValidVisitorId(value: string | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Resolve the visitor id for this request: reuse the cookie if present and
 * valid, otherwise mint a new one (the caller sets it as a response cookie).
 */
export function resolveVisitorId(cookieValue: string | undefined): string {
  return isValidVisitorId(cookieValue) ? cookieValue : newVisitorId();
}

/**
 * Hash an IP address with a server-side secret so we never store raw IPs.
 * Uses HMAC-SHA256 with a key derived from the deployment secret.
 * Non-IP "remote addresses" (e.g. "::1", "unknown") are hashed too — we
 * simply never log or store the raw value.
 */
export function hashIp(ip: string | null | undefined): string {
  const secret = process.env.CLICKRANK_IP_HASH_SECRET;
  const value = ip?.trim() || "unknown";
  // Deterministic HMAC even if the secret is unset in dev (still not raw IP);
  // in production the secret MUST be set.
  const key = secret || "dev-insecure-ip-hash-salt";
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

/**
 * Extract the best-effort client IP from a Next.js request.
 * Trusts the first X-Forwarded-For entry (standard behind most proxies).
 */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
