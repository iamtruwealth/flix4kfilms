import { useScrollExperience } from '../hooks/useScrollExperience'
import { smoothstep } from '../scroll/scrollState'

interface OverlayProps {
  scroll: ReturnType<typeof useScrollExperience>
}

/** Fixed top brand — fades out as the site navigation reveals. */
export function BrandBar({ scroll }: OverlayProps) {
  return (
    <header className="brand" style={{ opacity: 1 - scroll.navReveal }} aria-hidden="true">
      <span className="brand-mark">FLIX</span>
      <span className="brand-sub">4K</span>
    </header>
  )
}

/** Cinematic intro overlay — title + subtitle, fades with scroll. */
export function IntroOverlay({ scroll }: OverlayProps) {
  return (
    <div className="intro" style={{ opacity: scroll.introOpacity }}>
      <p className="intro-kicker">FLIX 4K FILMS<br />PHOTOGRAPHY · FILM</p>
      <h1 className="intro-title">EVERY MOMENT<br />HAS A FRAME.</h1>
      <p className="intro-secondary">WE MAKE IT LAST.</p>
      <p className="intro-sub">Portraits, weddings, events &amp; stories<br />captured with intention.</p>
      <p className="intro-tagline">STORIES WORTH FRAMING.</p>
    </div>
  )
}

/**
 * Transition beat — fades in as the camera rotation completes and out as the
 * LCD lights up, so it sits between rotation and the LCD portfolio reveal.
 * Derived from existing scroll state; no scroll-state logic is modified.
 */
export function LookAgainOverlay({ scroll }: OverlayProps) {
  const appear = smoothstep((scroll.cameraProgress - 0.7) / 0.3)
  const fade = 1 - smoothstep((scroll.screenIntensity - 0.3) / 0.7)
  const opacity = appear * fade
  return (
    <div className="look-again" style={{ opacity }}>
      LOOK AGAIN.
    </div>
  )
}

/** Scroll hint pinned low-center; visible during the reveal only. */
export function ScrollHint({ scroll }: OverlayProps) {
  return (
    <div className="hint" style={{ opacity: scroll.hintOpacity }}>
      <span className="hint-line" />
      <span className="hint-label">SCROLL TO EXPLORE</span>
    </div>
  )
}