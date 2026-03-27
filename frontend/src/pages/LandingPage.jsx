import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { PortalShell } from '../components/PortalShell'
import { SectionCard } from '../components/SectionCard'
import { formatDate, formatMoney, formatTime } from '../lib/format'

const credentials = [
  { label: 'CRM', email: 'crm@venueflow.test', password: 'Password123!' },
  { label: 'Organizer', email: 'organizer@venueflow.test', password: 'Password123!' },
  { label: 'Booker', email: 'booker@venueflow.test', password: 'Password123!' },
]

export function LandingPage() {
  const [preview, setPreview] = useState([])

  useEffect(() => {
    let cancelled = false

    api
      .get('/events')
      .then(({ data }) => {
        if (!cancelled) {
          setPreview(data.events.slice(0, 3))
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PortalShell
      actions={
        <>
          <Link className="primary-button" to="/events">
            Explore booking portal
          </Link>
          <Link className="ghost-button" to="/admin">
            Open organizer app
          </Link>
        </>
      }
      eyebrow="Full-stack assessment"
      subtitle="A single React application presenting three role-based portals on top of a Laravel API: CRM management, organizer operations, and public ticket booking."
      title="VenueFlow"
    >
      <section className="portal-grid">
        <article className="portal-card">
          <p className="section-kicker">CRM Application</p>
          <h2>Master data and platform analytics</h2>
          <p>Add countries, assign stadiums, monitor registered organizers, and review ticket and payment activity.</p>
          <Link className="inline-link" to="/crm">
            Open CRM
          </Link>
        </article>

        <article className="portal-card">
          <p className="section-kicker">Admin Application</p>
          <h2>Organizer workspace</h2>
          <p>Ticket purchases update ticket count and revenue in real time for organizers.</p>
          <Link className="inline-link" to="/admin">
            Open organizer portal
          </Link>
        </article>

        <article className="portal-card">
          <p className="section-kicker">User Application</p>
          <h2>Booking experience</h2>
          <p>New, updated, stopped, and deleted events appear in real time for customers.</p>
          <Link className="inline-link" to="/events">
            Open booking portal
          </Link>
        </article>
      </section>

      <div className="content-grid two-column">
        <SectionCard kicker="Demo access" title="Ready-to-use accounts">
          <div className="credential-list">
            {credentials.map((entry) => (
              <article className="credential-card" key={entry.label}>
                <h3>{entry.label}</h3>
                <p>{entry.email}</p>
                <strong>{entry.password}</strong>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard kicker="Implementation notes" title="What this build covers">
          <ul className="bullet-list">
            <li>Laravel API with Sanctum token auth, role-based routes, seeded demo data, and Stripe checkout session support.</li>
            <li>React frontend with three portal routes, Redux cart persistence, and server-sent events for live portal updates.</li>
            <li>Organizer ticket counts and revenue refresh automatically after purchases, and public events react live to create, update, stop, and delete actions.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard kicker="Live preview" title="Upcoming seeded events">
        <div className="event-preview-grid">
          {preview.map((event) => (
            <article className="event-preview-card" key={event.id}>
              <h3>{event.title}</h3>
              <p>
                {event.stadium}, {event.country}
              </p>
              <span>
                {formatDate(event.event_date)} | {formatTime(event.start_time)}
              </span>
              <strong>{formatMoney(event.price_cents)}</strong>
            </article>
          ))}
        </div>
      </SectionCard>
    </PortalShell>
  )
}
