import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// Server-side Supabase client with the secret (service role) key, which
// bypasses RLS. Never import this from browser code.
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    // SUPABASE_SECRET_KEY is the new name (sb_secret_...); the legacy service_role key also works.
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY environment variables must be set');
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// Throws a readable error for a failed Supabase call, otherwise returns its data.
export function unwrap<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) {
    throw new Error(`Failed to ${what}: ${result.error.message}`);
  }
  return result.data;
}
