import { Link } from 'react-router-dom'

/** 404 — the cinematic stage only lives on the home route. */
export function NotFoundPage() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">404</p>
        <h1>This frame is missing.</h1>
        <p className="page-lede">
          <Link to="/">Return home</Link> and scroll the reveal again.
        </p>
      </header>
    </div>
  )
}
