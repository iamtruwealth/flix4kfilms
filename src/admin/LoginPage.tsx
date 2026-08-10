import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { signInAdmin, sendPasswordReset } from './auth'

/**
 * /admin/login — private sign-in for the owner. No registration; the account
 * must already exist in Supabase Auth and be allowlisted in `admin_users`.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    const result = await signInAdmin(email, password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    // The ProtectedRoute onAuthStateChange will flip the gate to ready.
    navigate(from, { replace: true })
  }

  const onReset = async () => {
    setError(null)
    setNotice(null)
    const result = await sendPasswordReset(email)
    if (result.error) {
      setError(result.error)
      return
    }
    setNotice('If that address is registered, a reset link is on its way.')
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <p className="kicker">FLIX 4K</p>
        <h1>Control room.</h1>
        <p className="admin-login-lede">
          Sign in to manage photos, videos and categories.
        </p>

        <form className="admin-form" onSubmit={onSubmit}>
          <label className="admin-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="admin-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          {notice ? <p className="admin-notice">{notice}</p> : null}

          <button className="admin-btn" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button className="admin-link-btn" type="button" onClick={onReset} disabled={busy}>
          Forgot password?
        </button>

        <p className="admin-back">
          <Link to="/">← Back to the site</Link>
        </p>
      </div>
    </div>
  )
}
