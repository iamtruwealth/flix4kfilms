import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getAdminGate,
  getAdminGateState,
  isAdminUser,
  signInAdmin,
  signOutAdmin,
  sendPasswordReset,
  setAdminGateState,
} from './auth'
import { getSupabaseClient } from '../lib/supabaseClient'

/**
 * Auth gate contract:
 *  - no session            -> signedOut
 *  - session + allowlist   -> ready (with user)
 *  - session + not listed  -> denied
 *  - sign-in failure       -> friendly error, no exception
 */

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}))

const mockGetClient = vi.mocked(getSupabaseClient)

function makeClientStub(overrides: {
  adminMatch?: boolean
  signInError?: { message: string } | null
  resetError?: { message: string } | null
}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: overrides.adminMatch ? { user_id: 'u-1' } : null,
              error: null,
            }),
        }),
      }),
    }),
    auth: {
      signInWithPassword: () =>
        Promise.resolve({ error: overrides.signInError ?? null }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: () =>
        Promise.resolve({ error: overrides.resetError ?? null }),
    },
  }
}

describe('admin auth gate', () => {
  beforeEach(() => {
    mockGetClient.mockReset()
    setAdminGateState({ status: 'loading' })
  })

  it('returns signedOut when there is no session', async () => {
    const gate = await getAdminGate(null)
    expect(gate).toEqual({ status: 'signedOut' })
  })

  it('returns ready for an allowlisted session', async () => {
    mockGetClient.mockReturnValue(makeClientStub({ adminMatch: true }) as never)
    const gate = await getAdminGate({ user: { id: 'u-1', email: 'a@b.co' } })
    expect(gate).toEqual({
      status: 'ready',
      user: { id: 'u-1', email: 'a@b.co' },
    })
  })

  it('returns denied for an authenticated but non-allowlisted user', async () => {
    mockGetClient.mockReturnValue(makeClientStub({ adminMatch: false }) as never)
    const gate = await getAdminGate({ user: { id: 'u-2', email: 'c@d.co' } })
    expect(gate).toEqual({ status: 'denied' })
  })

  it('isAdminUser returns false when admin is not configured', async () => {
    mockGetClient.mockReturnValue(null)
    await expect(isAdminUser('u-1')).resolves.toBe(false)
  })
})

describe('sign-in / sign-out / reset', () => {
  beforeEach(() => {
    mockGetClient.mockReset()
    setAdminGateState({ status: 'loading' })
  })

  it('rejects empty credentials without calling the API', async () => {
    mockGetClient.mockReturnValue(makeClientStub({}) as never)
    const result = await signInAdmin('', '')
    expect(result.error).toMatch(/email and password/i)
  })

  it('returns no error on successful sign-in', async () => {
    mockGetClient.mockReturnValue(makeClientStub({}) as never)
    await expect(signInAdmin('a@b.co', 'secret')).resolves.toEqual({})
  })

  it('returns a friendly error when the API rejects credentials', async () => {
    mockGetClient.mockReturnValue(
      makeClientStub({ signInError: { message: 'Invalid login' } }) as never,
    )
    const result = await signInAdmin('a@b.co', 'wrong')
    expect(result.error).toMatch(/sign-in failed/i)
  })

  it('handles an unconfigured admin room gracefully', async () => {
    mockGetClient.mockReturnValue(null)
    const result = await signInAdmin('a@b.co', 'secret')
    expect(result.error).toMatch(/not configured/i)
  })

  it('signOutAdmin resolves without throwing when configured', async () => {
    mockGetClient.mockReturnValue(makeClientStub({}) as never)
    await expect(signOutAdmin()).resolves.toBeUndefined()
    expect(getAdminGateState()).toMatchObject({ status: 'signedOut' })
  })

  it('sendPasswordReset returns a friendly error on failure', async () => {
    mockGetClient.mockReturnValue(
      makeClientStub({ resetError: { message: 'nope' } }) as never,
    )
    const result = await sendPasswordReset('a@b.co')
    expect(result.error).toMatch(/could not send/i)
  })
})
