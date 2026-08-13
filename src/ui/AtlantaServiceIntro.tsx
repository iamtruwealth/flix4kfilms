import { Link } from 'react-router-dom'

export function AtlantaServiceIntro() {
  return (
    <section className="atlanta-service-intro" aria-labelledby="atlanta-service-title">
      <p className="kicker">METRO ATLANTA PHOTOGRAPHY</p>
      <h2 id="atlanta-service-title">Atlanta Photography for Weddings, Events &amp; Life in Motion</h2>
      <p>Just a few miles from Atlanta, FLIX 4K Photography provides an excellent and affordable crew for wedding photography, portraits, video, special events, and film productions across metro Atlanta. Our film-friendly locations include industrial exteriors, downtown views, botanical settings, and landscaped spaces.</p>
      <p>Our staff is highly trained, professional, friendly, and focused on getting the job done quickly and beautifully. From an Atlanta wedding photographer documenting the day as it unfolds to family portraits and event photography built to last, we create images that preserve the people, places, love, and memories that matter.</p>
      <p>FLIX 4K Photography welcomes clients of every background, identity, culture, family structure, and ability. We are committed to providing a respectful, inclusive, and non-discriminatory experience for everyone.</p>
      <nav aria-label="Atlanta photography services">
        <Link to="/portfolio/weddings">Atlanta wedding photography</Link>
        <Link to="/portfolio/events">Atlanta event photography</Link>
        <Link to="/portfolio/portraits">Atlanta portrait photography</Link>
        <Link to="/book">Book an Atlanta photographer</Link>
      </nav>
    </section>
  )
}
