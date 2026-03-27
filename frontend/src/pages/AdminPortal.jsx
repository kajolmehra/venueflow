import { startTransition, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api, apiMessage } from '../api/client'
import { AppModal } from '../components/AppModal'
import { useAuth } from '../auth/useAuth'
import { AuthPanel } from '../components/AuthPanel'
import { EventForm } from '../components/EventForm'
import { PortalShell } from '../components/PortalShell'
import { SectionCard } from '../components/SectionCard'
import { useRealtimeChannel } from '../hooks/useRealtimeChannel'
import { formatDate, formatDateTime, formatMoney, formatTime } from '../lib/format'

const emptyDraft = {
  title: '',
  description: '',
  country_id: '',
  stadium_id: '',
  event_date: '',
  start_time: '',
  end_time: '',
  price: '',
  total_tickets: '',
}

const adminSidebarItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/events', label: 'Manage events' },
  { to: '/admin/buyers', label: 'Buyers & payments' },
]

export function AdminPortal() {
  const { token, user } = useAuth()
  const [countries, setCountries] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [stoppingEventId, setStoppingEventId] = useState(null)
  const [deletingEventId, setDeletingEventId] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [isRealtimeReady, setIsRealtimeReady] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role !== 'admin' || !token) {
      return
    }

    setIsRealtimeReady(false)
    loadLookups()
    loadDashboard()
  }, [token, user])

  useRealtimeChannel({
    channel: user?.id ? `admin.dashboard.${user.id}` : '',
    enabled: Boolean(token && user?.role === 'admin' && isRealtimeReady),
    event: 'admin-dashboard.synced',
    onMessage: (payload) => {
      startTransition(() => {
        setDashboard(payload)
      })
    },
    token,
    type: 'private',
  })

  async function loadLookups() {
    try {
      const { data } = await api.get('/admin/lookups')
      setCountries(data.countries)
    } catch (requestError) {
      setError(apiMessage(requestError, 'Organizer lookups could not be loaded.'))
    }
  }

  async function loadDashboard() {
    try {
      const { data } = await api.get('/admin/dashboard')
      setDashboard(data)
      setError('')
    } catch (requestError) {
      setError(apiMessage(requestError, 'Organizer dashboard could not be loaded.'))
    } finally {
      setIsRealtimeReady(true)
    }
  }

  async function createEvent(payload) {
    setMessage('')
    setError('')

    const { data } = await api.post('/admin/events', payload)
    setMessage(data.message)

    return data
  }

  async function updateEvent(eventId, payload) {
    setMessage('')
    setError('')

    const { data } = await api.put(`/admin/events/${eventId}`, payload)
    setMessage(data.message)

    return data
  }

  async function stopEvent(id) {
    const confirmed = window.confirm('Stop ticket sales for this event? Users will no longer be able to book it.')

    if (!confirmed) {
      return
    }

    setMessage('')
    setError('')
    setStoppingEventId(id)

    try {
      const { data } = await api.post(`/admin/events/${id}/stop`)
      setMessage(data.message)
    } catch (requestError) {
      setError(apiMessage(requestError, 'Event could not be stopped.'))
    } finally {
      setStoppingEventId(null)
    }
  }

  async function deleteEvent(id) {
    const confirmed = window.confirm('Delete this event? This removes it from the booking portal immediately.')

    if (!confirmed) {
      return false
    }

    setMessage('')
    setError('')
    setDeletingEventId(id)

    try {
      const { data } = await api.delete(`/admin/events/${id}`)
      setMessage(data.message)
      return true
    } catch (requestError) {
      setError(apiMessage(requestError, 'Event could not be deleted.'))
      return false
    } finally {
      setDeletingEventId(null)
    }
  }

  function openCreateModal() {
    setEditingEventId(null)
    setIsCreateModalOpen(true)
  }

  function openEditModal(id) {
    setEditingEventId(id)
    setIsCreateModalOpen(true)
  }

  function closeEditorModal() {
    setEditingEventId(null)
    setIsCreateModalOpen(false)
  }

  if (!user) {
    return (
      <PortalShell
        eyebrow="Organizer application"
        subtitle="Create, manage, and stop events from here. This portal also reflects ticket sales in real time."
        title="Organizer workspace"
      >
        <AuthPanel
          allowRegistration
          role="admin"
          subtitle="Use organizer@venueflow.test / Password123! or create a fresh organizer account."
          title="Organizer login"
        />
      </PortalShell>
    )
  }

  if (user.role !== 'admin') {
    return (
      <PortalShell
        eyebrow="Organizer application"
        subtitle="This area only accepts organizer accounts."
        title="Wrong portal for the current session"
      >
        <SectionCard title="Switch accounts">
          <p>You're currently signed in as <strong>{user.role.replace('_', ' ')}</strong>. Use an organizer account to manage events here.</p>
        </SectionCard>
      </PortalShell>
    )
  }

  return (
    <PortalShell
      eyebrow="Organizer application"
      sidebarItems={adminSidebarItems}
      subtitle="Create events, manage inventory, and review bookings from a dedicated organizer workspace."
      title="Organizer workspace"
      variant="dashboard"
    >
      {message ? <p className="feedback-strip success">{message}</p> : null}
      {error ? <p className="feedback-strip error">{error}</p> : null}

      <Routes>
        <Route index element={<AdminOverviewPage dashboard={dashboard} onOpenCreateModal={openCreateModal} />} />
        <Route path="create" element={<Navigate replace to="/admin/events" />} />
        <Route path="events/:eventId/edit" element={<Navigate replace to="/admin/events" />} />
        <Route
          path="events"
          element={
            <AdminEventsPage
              dashboard={dashboard}
              deletingEventId={deletingEventId}
              onDeleteEvent={deleteEvent}
              onOpenCreateModal={openCreateModal}
              onOpenEditModal={openEditModal}
              onStopEvent={stopEvent}
              stoppingEventId={stoppingEventId}
            />
          }
        />
        <Route path="buyers" element={<AdminBuyersPage dashboard={dashboard} />} />
        <Route path="*" element={<Navigate replace to="/admin" />} />
      </Routes>

      {isCreateModalOpen ? (
        <EventEditorModal
          countries={countries}
          dashboard={dashboard}
          eventId={editingEventId}
          onClose={closeEditorModal}
          onSave={editingEventId ? updateEvent : createEvent}
        />
      ) : null}
    </PortalShell>
  )
}

function AdminOverviewPage({ dashboard, onOpenCreateModal }) {
  if (!dashboard) {
    return <LoadingSection title="Loading organizer dashboard" message="Fetching your live booking metrics..." />
  }

  const recentEvents = dashboard.events.slice(0, 4)
  const latestBuyers = dashboard.events.flatMap((event) => event.buyers.map((buyer) => ({ ...buyer, event_title: event.title }))).slice(0, 6)

  return (
    <div className="dashboard-page organizer-dashboard">
      <div className="dashboard-kpi-grid">
        <MetricCard accent="navy" label="Total events" note="Events created under this organizer account" value={dashboard.summary.total_events} />
        <MetricCard accent="teal" label="Live events" note="Events currently open for booking" value={dashboard.summary.live_events} />
        <MetricCard accent="amber" label="Stopped events" note="Events where ticket sales were manually stopped" value={dashboard.summary.stopped_events} />
        <MetricCard accent="olive" label="Tickets sold" note="All successful ticket purchases for your events" value={dashboard.summary.tickets_sold} />
        <MetricCard accent="slate" label="Deleted events" note="Soft-deleted records retained in the organizer ledger" value={dashboard.summary.deleted_events} />
        <MetricCard accent="rose" label="Revenue" note="Live payment value updated from completed bookings" value={formatMoney(dashboard.summary.revenue_cents)} />
      </div>

      <div className="content-grid two-column">
        <SectionCard className="dashboard-panel" kicker="Realtime booking status" title="Live sales snapshot">
          <div className="dashboard-highlight-block">
            <div className="dashboard-highlight-copy">
              <span className="dashboard-chip success">Live updates active</span>
              <h3>{dashboard.summary.tickets_sold} tickets sold</h3>
              <p>Ticket count and revenue refresh automatically whenever a user completes a purchase.</p>
            </div>
            <div className="dashboard-highlight-metrics">
              <article>
                <span>Revenue</span>
                <strong>{formatMoney(dashboard.summary.revenue_cents)}</strong>
              </article>
              <article>
                <span>Open events</span>
                <strong>{dashboard.summary.live_events}</strong>
              </article>
              <article>
                <span>Deleted records</span>
                <strong>{dashboard.summary.deleted_events}</strong>
              </article>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="dashboard-panel" kicker="Recent buyer activity" title="Latest bookings">
          <div className="dashboard-table">
            <div className="dashboard-table-head" style={{ gridTemplateColumns: '1fr 1fr .8fr' }}>
              <span>Buyer</span>
              <span>Event</span>
              <span>Amount</span>
            </div>
            <div className="dashboard-table-body">
              {latestBuyers.length ? (
                latestBuyers.map((buyer) => (
                  <article className="dashboard-table-row" key={buyer.ticket_code} style={{ gridTemplateColumns: '1fr 1fr .8fr' }}>
                    <div className="dashboard-cell-stack">
                      <strong>{buyer.buyer}</strong>
                      <span>{formatDateTime(buyer.purchased_at)}</span>
                    </div>
                    <span>{buyer.event_title}</span>
                    <strong>{formatMoney(buyer.amount_cents)}</strong>
                  </article>
                ))
              ) : (
                <article className="dashboard-table-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span>No purchases yet for this organizer.</span>
                </article>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        actions={
          <button className="primary-button" onClick={onOpenCreateModal} type="button">
            Create event
          </button>
        }
        className="dashboard-panel"
        kicker="Event snapshot"
        title="Current event portfolio"
      >
        <div className="event-admin-grid">
          {recentEvents.map((event) => (
            <article className="admin-event-card dashboard-event-card" key={event.id}>
              <div className="event-header-row">
                <div>
                  <h3>{event.title}</h3>
                  <p>
                    {event.stadium}, {event.country}
                  </p>
                </div>
                <span className={`dashboard-chip ${statusTone(event.status)}`}>{prettyStatus(event.status)}</span>
              </div>
              <div className="event-meta-grid">
                <span>{formatDate(event.event_date)}</span>
                <span>{formatTime(event.start_time)} to {formatTime(event.end_time)}</span>
                <span>{event.sold_tickets} sold</span>
                <span>{formatMoney(event.revenue_cents)}</span>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function AdminEventsPage({ dashboard, deletingEventId, onDeleteEvent, onOpenCreateModal, onOpenEditModal, onStopEvent, stoppingEventId }) {
  if (!dashboard) {
    return <LoadingSection title="Loading events" message="Fetching event records and live ticket data..." />
  }

  return (
    <SectionCard
      actions={
        <button className="primary-button" onClick={onOpenCreateModal} type="button">
          Create event
        </button>
      }
      className="dashboard-panel"
      kicker="Event list"
      title="Published events"
    >
      <div className="event-admin-grid">
        {dashboard.events.map((event) => (
          <article className="admin-event-card dashboard-event-card" key={event.id}>
            <div className="event-header-row">
              <div>
                <h3>{event.title}</h3>
                <p>
                  {event.stadium}, {event.country}
                </p>
              </div>
              <span className={`dashboard-chip ${statusTone(event.status)}`}>{prettyStatus(event.status)}</span>
            </div>

            <p className="muted-copy">{event.description}</p>

            <div className="event-meta-grid">
              <span>{formatDate(event.event_date)}</span>
              <span>{formatTime(event.start_time)} to {formatTime(event.end_time)}</span>
              <span>{formatMoney(event.price_cents)}</span>
              <span>{event.available_tickets} left</span>
            </div>

            <div className="event-meta-grid strong">
              <span>{event.sold_tickets} sold</span>
              <span>{formatMoney(event.revenue_cents)}</span>
            </div>

            <div className="card-action-row dashboard-inline-actions">
              <button
                className="inline-link"
                disabled={stoppingEventId === event.id || deletingEventId === event.id}
                onClick={() => onOpenEditModal(event.id)}
                type="button"
              >
                Edit
              </button>
              {event.status === 'active' ? (
                <button
                  className="inline-link"
                  disabled={stoppingEventId === event.id || deletingEventId === event.id}
                  onClick={() => onStopEvent(event.id)}
                  type="button"
                >
                  {stoppingEventId === event.id ? 'Stopping...' : 'Stop sales'}
                </button>
              ) : null}
              {event.status !== 'deleted' ? (
                <button
                  className="inline-link danger"
                  disabled={deletingEventId === event.id || stoppingEventId === event.id}
                  onClick={() => onDeleteEvent(event.id)}
                  type="button"
                >
                  {deletingEventId === event.id ? 'Deleting...' : 'Delete'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  )
}

function AdminBuyersPage({ dashboard }) {
  if (!dashboard) {
    return <LoadingSection title="Loading buyer records" message="Fetching ticket purchasers and payment references..." />
  }

  return (
    <SectionCard className="dashboard-panel" kicker="Buyer and payment data" title="Purchasers by event">
      <div className="dashboard-page">
        {dashboard.events.map((event) => (
          <article className="dashboard-subpanel" key={event.id}>
            <div className="dashboard-subpanel-head">
              <div>
                <h3>{event.title}</h3>
                <p>
                  {event.stadium}, {event.country}
                </p>
              </div>
              <div className="dashboard-inline-actions">
                <span className="dashboard-chip neutral">{event.sold_tickets} sold</span>
                <span className="dashboard-chip success">{formatMoney(event.revenue_cents)}</span>
              </div>
            </div>

            {event.buyers.length ? (
              <div className="dashboard-table">
                <div className="dashboard-table-head" style={{ gridTemplateColumns: '1fr .9fr .9fr .8fr' }}>
                  <span>Buyer</span>
                  <span>Purchased at</span>
                  <span>Payment reference</span>
                  <span>Amount</span>
                </div>
                <div className="dashboard-table-body">
                  {event.buyers.map((buyer) => (
                    <article className="dashboard-table-row" key={buyer.ticket_code} style={{ gridTemplateColumns: '1fr .9fr .9fr .8fr' }}>
                      <div className="dashboard-cell-stack">
                        <strong>{buyer.buyer}</strong>
                        <span>{buyer.buyer_email}</span>
                      </div>
                      <span>{formatDateTime(buyer.purchased_at)}</span>
                      <div className="dashboard-cell-stack">
                        <span>{buyer.payment_reference}</span>
                        <span>{buyer.ticket_code}</span>
                      </div>
                      <strong>{formatMoney(buyer.amount_cents)}</strong>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted-copy">No purchases yet for this event.</p>
            )}
          </article>
        ))}
      </div>
    </SectionCard>
  )
}

function LoadingSection({ title, message }) {
  return (
    <SectionCard className="dashboard-panel" title={title}>
      <p>{message}</p>
    </SectionCard>
  )
}

function MetricCard({ label, value, note, accent }) {
  return (
    <article className={`dashboard-kpi-card accent-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  )
}

function EventEditorModal({ countries, dashboard, eventId, onClose, onSave }) {
  const event = useMemo(
    () => (eventId ? dashboard?.events.find((entry) => String(entry.id) === String(eventId)) : null),
    [dashboard, eventId],
  )
  const [draft, setDraft] = useState(emptyDraft)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')
  const isEditMode = Boolean(eventId)

  useEffect(() => {
    if (isEditMode && event) {
      setDraft({
        title: event.title,
        description: event.description || '',
        country_id: String(event.country_id),
        stadium_id: String(event.stadium_id),
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        price: String(event.price_cents / 100),
        total_tickets: String(event.total_tickets),
      })
      return
    }

    setDraft(emptyDraft)
  }, [event, isEditMode])

  function updateDraft(nextEvent) {
    const { name, value } = nextEvent.target

    setDraft((current) => ({
      ...current,
      [name]: value,
      ...(name === 'country_id' ? { stadium_id: '' } : {}),
    }))
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    setSubmitting(true)
    setLocalError('')

    try {
      if (isEditMode && eventId) {
        await onSave(eventId, draft)
      } else {
        await onSave(draft)
      }
      onClose()
    } catch (requestError) {
      setLocalError(apiMessage(requestError, 'Event could not be saved.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppModal onClose={onClose} size="wide" title={isEditMode ? 'Edit event' : 'Create event'}>
      <EventForm
        countries={countries}
        draft={draft}
        mode={isEditMode ? 'edit' : 'create'}
        onChange={updateDraft}
        onSubmit={handleSubmit}
        showCancel={false}
        submitting={submitting}
      />
      {localError ? <p className="form-error">{localError}</p> : null}
    </AppModal>
  )
}

function prettyStatus(value) {
  return String(value).replace('_', ' ')
}

function statusTone(value) {
  if (value === 'deleted') {
    return 'danger'
  }

  if (value === 'stopped') {
    return 'warning'
  }

  return 'success'
}
