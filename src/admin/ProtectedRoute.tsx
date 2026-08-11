import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabaseClient'
import { getAdminGate, setAdminGateState, type AdminGateState } from './auth'

/**
 * Guards the /admin subtree.
 *
 * Always resolves auth before rendering protected content — the loading state
 * is explicit so an unauthenticated visitor never sees a flash of admin UI.
 * A signed-in non-admin sees a denial screen instead of the panel.
 *
 * The gate lives in local state initialized to `loading` so a stale value from
 * a previous mount (e.g. an earlier signed-out redirect) can never cause an
 * immediate bounce back to the login page before this mount resolves the
 * current session. Resolved values are mirrored to the shared store so
 * side-pages (Settings) and tests see the same view.
 */
export function ProtectedRoute() {
  const [gate, setGate] = useState<AdminGateState>({ status: 'loading' })
  const location = useLocation()

  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) {
      setAdminGateState({ status: 'signedOut' })
      setGate({ status: 'signedOut' })
      return
    }

    let alive = true
    const apply = (next: AdminGateState) => {
      setGate(next)
      setAdminGateState(next)
    }
    const resolve = async () => {
      const { data } = await client.auth.getSession()
      const session = data.session
      if (!alive) return
      const next = await getAdminGate(session)
      if (alive) apply(next)
    }

    void resolve()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      // Only gate reads trigger a re-resolve; token refresh events are noisy
      // but the gate is idempotent so re-running is harmless.
      void getAdminGate(session).then((next) => {
        if (alive) apply(next)
      })
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  if (gate.status === 'loading') {
    return (
      <div className="admin-loading" role="status">
        <p>Checking access…</p>
      </div>
    )
  }

  if (gate.status === 'signedOut') {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  if (gate.status === 'denied') {
    return (
      <div className="admin-denied">
        <p className="kicker">ACCESS DENIED</p>
        <h1>Not on the admin list.</h1>
        <p>Your account is not registered as a site administrator.</p>
      </div>
    )
  }

  return <Outlet />
}
