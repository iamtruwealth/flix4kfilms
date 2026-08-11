import { useEffect, useRef, useState } from 'react'
import {
  buildInlineParams,
  buildUiConfig,
  ensureCalScript,
  type CalCallbackEvent,
} from '../lib/calEmbed'

export interface CalBookingWidgetProps {
  calLink?: string
  onBookingSuccess?: (e: CalCallbackEvent) => void
}

const FALLBACK_COPY =
  'ONLINE BOOKING IS TEMPORARILY UNAVAILABLE. Please contact FLIX 4K FILMS directly to schedule your session.'

export function CalBookingWidget({
  calLink = 'flix4kfilms',
  onBookingSuccess,
}: CalBookingWidgetProps) {
  const slotRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const cal = await ensureCalScript()
        if (cancelled) return
        const slot = slotRef.current
        if (!slot) return

        slot.replaceChildren()
        cal('init', { origin: 'https://app.cal.com' })
        cal('ui', buildUiConfig())
        cal('on', {
          action: 'linkFailed',
          callback: () => {
            if (!cancelled) setStatus('failed')
          },
        })
        if (onBookingSuccess) {
          cal('on', {
            action: 'bookingSuccessfulV2',
            callback: (e) => onBookingSuccess(e),
          })
        }
        cal('inline', buildInlineParams(slot, calLink))
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('failed')
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [calLink, onBookingSuccess])

  if (status === 'failed') {
    return <p className="book-fallback">{FALLBACK_COPY}</p>
  }

  return (
    <div className={`book-embed${status === 'loading' ? ' book-embed-loading' : ''}`}>
      <div ref={slotRef} className="book-embed-slot" aria-busy={status === 'loading'} />
    </div>
  )
}
