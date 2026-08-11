import { Link } from 'react-router-dom'

/** Studio bio — static editorial copy, no repository dependency. */
export function AboutPage() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">ABOUT</p>
        <h1>The studio.</h1>
        <p className="page-lede">
          One camera. One discipline. Monochrome, shot at 4K, graded by hand.
        </p>
      </header>

      <div className="prose">
        <p>
          FLIX 4K is a monochrome photography studio built around a single
          principle: constrain the tools, and the craft does the rest. Every
          commission — weddings, events, birthdays, portraits — is shot on the
          same camera, in black and white, and finished at 4K.
        </p>
        <p>
          The site itself is a film: scroll, and the camera that made the work
          turns to greet you, its LCD running through the archive before the
          pages take over.
        </p>
      </div>

      <p className="about-cta">
        <Link to="/book">Book a session →</Link>
      </p>
    </div>
  )
}
