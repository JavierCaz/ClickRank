import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key.
 *
 * Security note: this module is tagged `server-only` — bundlers will refuse
 * to import it from client components, so the service-role key can never
 * leak to the browser. All data access (reads for the leaderboard, writes
 * for submissions and clicks) happens here, on the server.
 */

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      // The service-role client is used for trusted server-side operations.
      // It must never be shared with the browser.
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "public" },
  });

  return cachedClient;
}
