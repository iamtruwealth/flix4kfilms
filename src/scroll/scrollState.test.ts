import { describe, expect, it } from 'vitest'
import {
  cameraDistance,
  cameraHandoff,
  cameraPan,
  cameraProgress,
  cameraYaw,
  hintOpacity,
  introOpacity,
  lcdCursor,
  navReveal,
  phaseAt,
  photoIndex,
  portfolioReveal,
  screenIntensity,
  stageOpacity,
} from './scrollState'
import { DEFAULT_CALIBRATION } from '../lib/calibrationPresets'

const phases = DEFAULT_CALIBRATION.phases
const rot = DEFAULT_CALIBRATION.rotation

describe('phaseAt — determinism & boundaries', () => {
  it('returns INTRO at progress 0 and before rotation starts', () => {
    expect(phaseAt(0, phases)).toBe('INTRO')
    expect(phaseAt(phases.rotationStart - 1e-6, phases)).toBe('INTRO')
    expect(phaseAt(phases.rotationStart, phases)).toBe('CAMERA_ROTATION')
    expect(phaseAt(phases.rotationEnd, phases)).toBe('CAMERA_SETTLE')
    expect(phaseAt(phases.settleEnd, phases)).toBe('CAMERA_LOCK')
    expect(phaseAt(phases.lockEnd, phases)).toBe('LCD_PORTFOLIO')
    expect(phaseAt(phases.lcdEnd, phases)).toBe('LCD_HOLD')
    expect(phaseAt(phases.lcdHoldEnd, phases)).toBe('CAMERA_HANDOFF')
    expect(phaseAt(phases.handoffEnd, phases)).toBe('NAV_REVEAL')
    expect(phaseAt(phases.navEnd, phases)).toBe('PORTFOLIO')
  })

  it('holds PORTFOLIO at progress 1', () => {
    expect(phaseAt(1, phases)).toBe('PORTFOLIO')
  })
})

describe('cameraProgress — deterministic, monotonic, reversible', () => {
  it('is 0 before rotation and 1 at/after rotation end', () => {
    expect(cameraProgress(0, phases)).toBe(0)
    expect(cameraProgress(phases.rotationStart - 0.001, phases)).toBe(0)
    expect(cameraProgress(phases.rotationEnd, phases)).toBe(1)
    expect(cameraProgress(phases.rotationEnd + 0.01, phases)).toBe(1)
  })
})

describe('cameraYaw', () => {
  it('starts at startRotation and reaches startRotation + spanRotation', () => {
    expect(cameraYaw(0, phases, rot)).toBe(0)
    expect(cameraYaw(phases.rotationEnd, phases, rot)).toBe(Math.PI)
  })
})

describe('cameraDistance & cameraPan', () => {
  it('is the intro distance before the lock window and lock distance after', () => {
    expect(cameraDistance(0, phases, 6, 5.2)).toBe(6)
    expect(cameraDistance(phases.lockEnd, phases, 6, 5.2)).toBe(5.2)
  })

  it('pan reaches the calibrated orbitPan by lock', () => {
    expect(cameraPan(phases.lockEnd, phases, 0.22)).toBeCloseTo(0.22)
  })
})

describe('screenIntensity — brightness of the LCD backlight', () => {
  it('is 0 during the intro and rotation', () => {
    expect(screenIntensity(0, phases)).toBe(0)
    expect(screenIntensity(0.2, phases)).toBe(0)
  })

  it('reaches 1 at lock and holds through LCD_HOLD, fading by handoff end', () => {
    expect(screenIntensity(phases.lockEnd, phases)).toBe(1)
    expect(screenIntensity(phases.lcdEnd, phases)).toBe(1)
    expect(screenIntensity(phases.lcdHoldEnd - 1e-6, phases)).toBe(1)
    expect(screenIntensity(phases.handoffEnd, phases)).toBe(0)
  })
})

describe('introOpacity', () => {
  it('is 1 at the very top and 0 after rotation starts', () => {
    expect(introOpacity(0, phases)).toBe(1)
    expect(introOpacity(phases.rotationStart, phases)).toBe(0)
  })
})

describe('photoIndex — deterministic LCD photo index', () => {
  it('is -1 before lock', () => {
    expect(photoIndex(0, phases, 8)).toBe(-1)
    expect(photoIndex(phases.lockEnd - 1e-6, phases, 8)).toBe(-1)
  })

  it('is -1 (no photo) when the catalog is empty', () => {
    expect(photoIndex(0, phases, 0)).toBe(-1)
    expect(photoIndex(phases.lockEnd + 1e-6, phases, 0)).toBe(-1)
    expect(photoIndex(1, phases, 0)).toBe(-1)
  })

  it('walks 0..n-1 and then holds the last frame through the handoff', () => {
    expect(photoIndex(phases.lockEnd + 1e-6, phases, 8)).toBe(0)
    expect(photoIndex(phases.lcdEnd, phases, 8)).toBe(7)
    expect(photoIndex(phases.lcdHoldEnd, phases, 8)).toBe(7)
    expect(photoIndex(phases.handoffEnd, phases, 8)).toBe(7)
    expect(photoIndex(1, phases, 8)).toBe(7)
  })
})

describe('lcdCursor', () => {
  it('is 0 before lock and 1 at the final frame', () => {
    expect(lcdCursor(0, phases)).toBe(0)
    expect(lcdCursor(phases.lcdEnd, phases)).toBe(1)
    expect(lcdCursor(1, phases)).toBe(1)
  })
})

describe('hintOpacity', () => {
  it('is visible until lock', () => {
    expect(hintOpacity(0, phases)).toBe(1)
    expect(hintOpacity(phases.lockEnd, phases)).toBe(0)
  })
})

describe('cameraHandoff / navReveal / portfolioReveal', () => {
  it('camera is fully present until the hold ends, then recedes', () => {
    expect(cameraHandoff(phases.lcdHoldEnd, phases)).toBe(0)
    expect(cameraHandoff(phases.lcdHoldEnd + 1e-6, phases)).toBeGreaterThan(0)
    expect(cameraHandoff(phases.handoffEnd, phases)).toBe(1)
    expect(cameraHandoff(1, phases)).toBe(1)
  })

  it('handoff is reversible and monotonic', () => {
    expect(cameraHandoff(0, phases)).toBe(0)
    expect(cameraHandoff(phases.lcdHoldEnd + 1e-6, phases)).toBeLessThan(
      cameraHandoff(phases.handoffEnd - 1e-6, phases),
    )
  })

  it('nav starts hidden and completes by navEnd', () => {
    expect(navReveal(phases.handoffEnd, phases)).toBe(0)
    expect(navReveal(phases.navEnd, phases)).toBe(1)
    expect(navReveal(1, phases)).toBe(1)
  })

  it('portfolio starts hidden and fades in after navEnd', () => {
    expect(portfolioReveal(phases.navEnd, phases)).toBe(0)
    expect(portfolioReveal(1, phases)).toBe(1)
  })
})

describe('stageOpacity', () => {
  it('is 1 during the camera and 0 after the handoff', () => {
    expect(stageOpacity(0, phases)).toBe(1)
    expect(stageOpacity(phases.lcdHoldEnd, phases)).toBe(1)
    expect(stageOpacity(phases.handoffEnd, phases)).toBe(0)
  })
})
