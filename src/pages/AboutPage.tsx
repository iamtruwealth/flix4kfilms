import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">ABOUT</p>
        <h1>The studio.</h1>
      </header>

      <div className="prose">
        <p>
          Just a few miles from Atlanta, FLIX 4K Photography provides an excellent
          and affordable crew for filming, video, photography, and special events.
          Our many locations offer multiple industrial exterior backgrounds with
          views of downtown in an extremely film-friendly environment and amazing
          botanical and landscaped places.
        </p>
        <p>
          Our staff is highly trained, highly professional, and very friendly.
        </p>
        <p>We will get the job done quickly and beautifully.</p>
        <p>
          Photography is about seeing LIFE in pictures and capturing each moment
          that will preserve a lasting memory. Photographers must also know how to
          tell an undying LOVE story through a lens. Our world is literally in a
          perpetual forward motion, but one thing that is constant is FAMILY. We
          like to think that when you reflect upon your past you will have
          photographs to capture moments of your life, love, and family that will
          leave a lasting imprint in your heart.
        </p>
      </div>

      <p className="about-cta">
        <Link to="/book">Book a session →</Link>
      </p>
    </div>
  )
}
