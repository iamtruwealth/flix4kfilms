import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { getCacheSnapshot } from '../../lib/contentCache'
import { getAdminGateState, type AdminGateState } from '../auth'

/**
 * Settings — provider status, session, and storage config. Read-only today;
 * nothing here is hardcoded, everything reflects the live runtime.
 */

export function SettingsPage() {
  const [gate, setGate] = useState<AdminGateState>(getAdminGateState())

  useEffect(() => {
    const id = window.setInterval(() => setGate(getAdminGateState()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const supabase = getSupabaseClient()
  const cache = getCacheSnapshot()

  const rows: { label: string; value: string }[] = [
    {
      label: 'Content source',
      value: cache.source === 'supabase' ? 'Supabase (live)' : 'Local catalog',
    },
    {
      label: 'Cache hydrated',
      value: cache.hydrated ? 'Yes' : 'No',
    },
    {
      label: 'Cached photos',
      value: String(cache.items.length),
    },
    {
      label: 'Cached categories',
      value: String(cache.categories.length),
    },
    {
      label: 'Cached videos',
      value: String(cache.videos.length),
    },
    {
      label: 'Storage bucket',
      value: supabase ? 'portfolio-images / portfolio-videos' : 'Unavailable (local mode)',
    },
    {
      label: 'Session',
      value:
        gate.status === 'ready'
          ? `Signed in as ${gate.user.email}`
          : gate.status === 'denied'
            ? 'Denied'
            : gate.status === 'signedOut'
              ? 'Signed out'
              : 'Loading…',
    },
  ]

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <p className="kicker">SETTINGS</p>
        <h1>Runtime status.</h1>
        <p className="admin-page-lede">Where content lives right now and how the panel connects.</p>
      </header>

      <div className="admin-card">
        <h2 className="admin-card-title">Status</h2>
        <dl className="admin-settings">
          {rows.map((row) => (
            <div key={row.label} className="admin-settings-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
