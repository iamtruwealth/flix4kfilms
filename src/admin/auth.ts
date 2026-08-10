import { getSupabaseClient } from '../lib/supabaseClient'
import { createStore, useStore } from '../lib/store'

/**
 * Admin identity + session handling.
 *
 * Security model: Supabase Auth signs the user in, but "logged in" does NOT
 * mean "admin". The `admin_users` allowlist (user id → role) is the gate. RLS
 * enforces it server-side for every data access; these helpers are the UX half.
 */

export interface AdminUser {
  id: string
  email: string
}

export type AdminGateState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'denied' }
  | { status: 'ready'; user: AdminUser }

/** External store so the ProtectedRoute + login page share one session view. */
export const adminAuthStore = createStore<{ gate: AdminGateState }>({
  gate: { status: 'loading' },
})

export function getAdminGateState(): AdminGateState {
  return adminAuthStore.get().gate
}

export function setAdminGateState(gate: AdminGateState): void {
  adminAuthStore.set({ gate })
}

/** React hook over the shared admin gate state. */
export function useAdminGate(): AdminGateState {
  return useStore(adminAuthStore).gate
}

/** Resolve the gate for a session: signedOut / ready / denied. */
export async function getAdminGate(session: { user: { id: string; email?: string | null } } | null): Promise<AdminGateState> {
  if (!session) return { status: 'signedOut' }

  const isAdmin = await isAdminUser(session.user.id)
  if (!isAdmin) return { status: 'denied' }

  return {
    status: 'ready',
    user: { id: session.user.id, email: session.user.email ?? 'admin' },
  }
}

/** Check the admin_users allowlist for a user id. */
export async function isAdminUser(userId: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false
  const { data, error } = await client
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}

/** Email/password sign-in for the admin room. Returns a friendly error or undefined. */
export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  const client = getSupabaseClient()
  if (!client) return { error: 'Admin is not configured (Supabase env vars missing).' }
  if (!email || !password) return { error: 'Enter your email and password.' }

  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: 'Sign-in failed — check your email and password.' }
  }
  return {}
}

/** Sign out of the admin session. */
export async function signOutAdmin(): Promise<void> {
  const client = getSupabaseClient()
  if (!client) return
  await client.auth.signOut()
  setAdminGateState({ status: 'signedOut' })
}

/** Password reset email. Returns a friendly error or undefined. */
export async function sendPasswordReset(email: string): Promise<{ error?: string }> {
  const client = getSupabaseClient()
  if (!client) return { error: 'Admin is not configured (Supabase env vars missing).' }
  if (!email) return { error: 'Enter your email address.' }

  const { error } = await client.auth.resetPasswordForEmail(email)
  if (error) return { error: 'Could not send reset link — try again.' }
  return {}
}
