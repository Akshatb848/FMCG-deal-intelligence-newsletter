/**
 * Supabase client — used by Next.js API routes (server-side only).
 * We use an untyped client and apply explicit types at each call site
 * to avoid the "never" inference issue with hand-written Database generics.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
  }
}

/**
 * Lazily create the public Supabase client (respects RLS).
 * Called at request time, not at module load, so env vars are available.
 */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? supabaseUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? supabaseAnonKey;
  if (!url || !key) throw new Error('Supabase not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Server-side client — bypasses RLS via service_role key (API routes only, never browser).
 */
export function createServiceClient() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL ?? supabaseUrl;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service client not configured: set SUPABASE_SERVICE_KEY');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Backwards-compat alias — prefer getSupabase() in new code
export const supabase = { from: (...args: Parameters<ReturnType<typeof getSupabase>['from']>) => getSupabase().from(...args) } as ReturnType<typeof getSupabase>;
