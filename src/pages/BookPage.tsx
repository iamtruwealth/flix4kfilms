import { CalBookingWidget } from '../ui/CalBookingWidget'

/**
 * Booking page — hosts the hosted Cal.com booking experience inline.
 * The four services (WEDDINGS / EVENTS / BIRTHDAYS / PORTRAITS) and their
 * availability live in the Cal.com dashboard, not here. Submission is a
 * scheduling reservation; FLIX contacts the client directly afterwards to
 * arrange the deposit and final details. There is no online payment.
 */
export function BookPage() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">BOOK ONLINE</p>
        <h1>Let&rsquo;s create something worth remembering.</h1>
        <p className="page-lede">
          Choose your session and preferred time. Your request is received
          instantly and your selected time is reserved in the studio calendar.
        </p>
      </header>

      <CalBookingWidget calLink="flix4kfilms" />

      <section className="book-reassure" aria-label="How booking works">
        <h2 className="book-reassure-title">HOW BOOKING WORKS</h2>
        <dl className="book-steps">
          <div className="book-step">
            <dt>BOOKING REQUEST</dt>
            <dd>Choose your session and preferred time.</dd>
          </div>
          <div className="book-step">
            <dt>CONFIRMATION</dt>
            <dd>
              Your booking request is received and your selected time is
              reserved immediately.
            </dd>
          </div>
          <div className="book-step">
            <dt>PERSONAL CONTACT</dt>
            <dd>
              We&rsquo;ll contact you directly to confirm the remaining details
              and arrange your required deposit.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
