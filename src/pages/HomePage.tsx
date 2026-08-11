import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useScrollExperience } from '../hooks/useScrollExperience'
import { useScrollExperienceHost } from '../hooks/useScrollExperienceHost'
import { useDebugKeys } from '../hooks/useDebugKeys'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useCachedPortfolioItems } from '../portfolio/hooks'
import { BrandBar, IntroOverlay, LookAgainOverlay, ScrollHint } from '../ui/TypeOverlays'
import { PortfolioGrid } from '../ui/PortfolioGrid'
import { DebugUI } from '../ui/DebugUI'
import { ViewportCrosshair } from '../experience/CalibrationGuides'
import { HeroDotField } from '../ui/HeroDotField'

// The 3D scene (three + drei) is the heavy part — split it so the page shell
// paints immediately and the model loads async behind the intro overlay.
const Experience = lazy(() =>
  import('../experience/Experience').then((m) => ({ default: m.Experience })),
)

/**
 * Home — the cinematic scroll experience: camera reveal → LCD portfolio →
 * final-frame hold → camera handoff → navigation reveal → the portfolio grid
 * below the fold. All overlays ride on the scroll state machine.
 */
export function HomePage() {
  useDebugKeys()
  const reduced = useReducedMotion()
  const items = useCachedPortfolioItems()
  const featuredOnly = items.filter((i) => i.featured)
  const featured = featuredOnly.length > 0 ? featuredOnly.slice(0, 8) : items.slice(0, 8)
  const scroll = useScrollExperience(featured.length)
  const { trackRef, enabled, scrollLengthVh } = useScrollExperienceHost()

  const trackHeight = enabled ? scrollLengthVh : 100
  const stageGone = scroll.stageOpacity <= 0

  return (
    <>
      <div
        className="stage"
        style={{ opacity: scroll.stageOpacity }}
        aria-hidden={stageGone}
      >
        <HeroDotField />
        <div className="stage-3d">
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </div>
      </div>

      <div ref={trackRef} className="track" style={{ height: `${trackHeight}vh` }} />

      {reduced && (
        <p className="reduced-note">Reduced motion — the reveal is shown as a still.</p>
      )}

      <BrandBar scroll={scroll} />
      <IntroOverlay scroll={scroll} />
      <LookAgainOverlay scroll={scroll} />
      <ScrollHint scroll={scroll} />
      <DebugUI />
      <ViewportCrosshair />

      <section
        className="portfolio"
        style={{ opacity: scroll.portfolioReveal }}
        aria-label="Selected work"
      >
        <header className="portfolio-head">
          <p className="kicker">SELECTED WORK</p>
          <h2>Portfolio</h2>
        </header>
        <PortfolioGrid items={featured} />
        <footer className="portfolio-foot">
          <p><Link to="/portfolio">Continue to the full portfolio →</Link></p>
        </footer>
      </section>

      <div className="grain" aria-hidden="true" />
    </>
  )
}
