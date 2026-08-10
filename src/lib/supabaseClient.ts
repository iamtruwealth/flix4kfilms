import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazy Supabase client singleton.
 *
 * Browser-side only ever holds the publishable (anon) key — authorization is
 * enforced by Postgres RLS and Storage policies, never by the client. Returns
 * null when the project isn't configured so the app degrades to the local
 * catalog instead of throwing.
 */

let client: SupabaseClient | null = null
let initError: Error | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (initError) return null
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    initError = new Error('Supabase env vars missing — using local content.')
    return null
  }

  try {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
    return client
  } catch (err) {
    initError = err instanceof Error ? err : new Error('Supabase init failed')
    return null
  }
}
