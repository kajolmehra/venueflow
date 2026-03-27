import { startTransition, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api, apiMessage } from '../api/client'
import { AppModal } from '../components/AppModal'
import { useAuth } from '../auth/useAuth'
import { AuthPanel } from '../components/AuthPanel'
import { PortalShell } from '../components/PortalShell'
import { SectionCard } from '../components/SectionCard'
import { useRealtimeChannel } from '../hooks/useRealtimeChannel'
import { formatDate, formatDateTime, formatMoney, formatTime } from '../lib/format'

const crmSidebarItems = [
  { to: '/crm', label: 'Dashboard', end: true },
  { to: '/crm/countries', label: 'Countries' },
  { to: '/crm/stadiums', label: 'Stadiums' },
  { to: '/crm/admins', label: 'Admins' },
  { to: '/crm/events', label: 'Events' },
  { to: '/crm/payments', label: 'Payments' },
  { to: '/crm/tickets', label: 'Tickets' },
]

export function CrmPortal() {
  const { token, user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [countryName, setCountryName] = useState('')
  const [stadiumForm, setStadiumForm] = useState({ country_id: '', name: '' })
  const [countryBusy, setCountryBusy] = useState(false)
  const [stadiumBusy, setStadiumBusy] = useState(false)
  const [removingCountryId, setRemovingCountryId] = useState(null)
  const [removingStadiumId, setRemovingStadiumId] = useState(null)
  const [isRealtimeReady, setIsRealtimeReady] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [countryError, setCountryError] = useState('')
  const [stadiumError, setStadiumError] = useState('')

  useEffect(() => {
    if (user?.role !== 'super_admin' || !token) {
      return
    }

    setIsRealtimeReady(false)
    loadDashboard()
  }, [token, user])

  useRealtimeChannel({
    channel: 'crm.dashboard',
    enabled: Boolean(token && user?.role === 'super_admin' && isRealtimeReady),
    event: 'crm-dashboard.synced',
    onMessage: (payload) => {
      startTransition(() => {
        setDashboard(payload)
      })
    },
    token,
    type: 'private',
  })

  async function loadDashboard() {
    try {
      const { data } = await api.get('/crm/dashboard')
      setDashboard(data)
    } catch (requestError) {
      setError(apiMessage(requestError, 'CRM data could not be loaded.'))
    } finally {
      setIsRealtimeReady(true)
    }
  }

  async function handleCountrySubmit(event) {
    event.preventDefault()
    setCountryBusy(true)
    setError('')
    setMessage('')
    setCountryError('')

    try {
      const { data } = await api.post('/crm/countries', { name: countryName })
      setMessage(data.message)
      setCountryName('')
      await loadDashboard()
      return true
    } catch (requestError) {
      setCountryError(apiMessage(requestError, 'Country could not be saved.'))
      return false
    } finally {
      setCountryBusy(false)
    }
  }

  async function handleStadiumSubmit(event) {
    event.preventDefault()
    setStadiumBusy(true)
    setError('')
    setMessage('')
    setStadiumError('')

    try {
      const { data } = await api.post('/crm/stadiums', stadiumForm)
      setMessage(data.message)
      setStadiumForm({ country_id: '', name: '' })
      await loadDashboard()
      return true
    } catch (requestError) {
      setStadiumError(apiMessage(requestError, 'Stadium could not be saved.'))
      return false
    } finally {
      setStadiumBusy(false)
    }
  }

  async function removeCountry(country) {
    const confirmed = window.confirm(`Remove "${country.name}" from the CRM list?`)

    if (!confirmed) {
      return
    }

    setError('')
    setMessage('')
    setRemovingCountryId(country.id)

    try {
      const { data } = await api.delete(`/crm/countries/${country.id}`)
      setMessage(data.message)
      await loadDashboard()
    } catch (requestError) {
      setError(apiMessage(requestError, 'Country could not be removed.'))
    } finally {
      setRemovingCountryId(null)
    }
  }

  async function removeStadium(stadium) {
    const confirmed = window.confirm(`Remove "${stadium.name}" from ${stadium.country.name}?`)

    if (!confirmed) {
      return
    }

    setError('')
    setMessage('')
    setRemovingStadiumId(stadium.id)

    try {
      const { data } = await api.delete(`/crm/stadiums/${stadium.id}`)
      setMessage(data.message)
      await loadDashboard()
    } catch (requestError) {
      setError(apiMessage(requestError, 'Stadium could not be removed.'))
    } finally {
      setRemovingStadiumId(null)
    }
  }

  if (!user) {
    return (
      <PortalShell
        eyebrow="CRM application"
        subtitle="Sign in with the seeded super-admin account to manage countries, stadiums, and platform analytics."
        title="Super admin workspace"
      >
        <AuthPanel
          role="super_admin"
          subtitle="Use crm@venueflow.test / Password123! to review the seeded data and CRM flows."
          title="CRM login"
        />
      </PortalShell>
    )
  }

  if (user.role !== 'super_admin') {
    return (
      <PortalShell
        eyebrow="CRM application"
        subtitle="This area is reserved for the seeded super-admin account."
        title="Wrong portal for the current session"
      >
        <SectionCard title="Switch accounts">
          <p>You're currently signed in as <strong>{user.role.replace('_', ' ')}</strong>. Use the CRM demo account to access this panel.</p>
        </SectionCard>
      </PortalShell>
    )
  }

  return (
    <PortalShell
      eyebrow="CRM application"
      sidebarItems={crmSidebarItems}
      subtitle="Manage countries and stadiums, and review organizer, event, ticket, and payment data from a professional CRM workspace."
      title="Super admin workspace"
      variant="dashboard"
    >
      {message ? <p className="feedback-strip success">{message}</p> : null}
      {error ? <p className="feedback-strip error">{error}</p> : null}

      <Routes>
        <Route index element={<CrmOverviewPage dashboard={dashboard} />} />
        <Route
          path="countries"
          element={
            <CrmCountriesPage
              countryBusy={countryBusy}
              countryError={countryError}
              countryName={countryName}
              dashboard={dashboard}
              onRemoveCountry={removeCountry}
              onSubmit={handleCountrySubmit}
              removingCountryId={removingCountryId}
              setCountryError={setCountryError}
              setCountryName={setCountryName}
            />
          }
        />
        <Route
          path="stadiums"
          element={
            <CrmStadiumsPage
              dashboard={dashboard}
              onSubmit={handleStadiumSubmit}
              onRemoveStadium={removeStadium}
              removingStadiumId={removingStadiumId}
              setStadiumError={setStadiumError}
              setStadiumForm={setStadiumForm}
              stadiumBusy={stadiumBusy}
              stadiumError={stadiumError}
              stadiumForm={stadiumForm}
            />
          }
        />
        <Route path="admins" element={<CrmAdminsPage dashboard={dashboard} />} />
        <Route path="events" element={<CrmEventsPage dashboard={dashboard} />} />
        <Route path="payments" element={<CrmPaymentsPage dashboard={dashboard} />} />
        <Route path="tickets" element={<CrmTicketsPage dashboard={dashboard} />} />
        <Route path="*" element={<Navigate replace to="/crm" />} />
      </Routes>
    </PortalShell>
  )
}

function CrmOverviewPage({ dashboard }) {
  if (!dashboard) {
    return <LoadingSection title="Loading CRM dashboard" message="Fetching platform analytics and master data..." />
  }

  const recentEvents = dashboard.events.slice(0, 5)
  const recentPayments = dashboard.purchases.slice(0, 5)
  const topAdmins = [...dashboard.admins].sort((left, right) => right.events_posted - left.events_posted).slice(0, 5)

  return (
    <div className="dashboard-page crm-dashboard">
      <div className="dashboard-kpi-grid">
        <MetricCard accent="navy" label="Registered admins" note="Organizer accounts active on the platform" value={dashboard.summary.registered_admins} />
        <MetricCard accent="teal" label="Allowed countries" note="Only these countries can be used in event posting" value={dashboard.summary.countries} />
        <MetricCard accent="amber" label="Stadiums mapped" note="Country-linked venues available to organizers" value={dashboard.summary.stadiums} />
        <MetricCard accent="slate" label="Events tracked" note="All live, stopped, and deleted event records" value={dashboard.summary.events} />
        <MetricCard accent="olive" label="Tickets sold" note="Issued tickets across every event" value={dashboard.summary.tickets_sold} />
        <MetricCard accent="rose" label="Revenue captured" note="Paid order value recorded in the CRM" value={formatMoney(dashboard.summary.revenue_cents)} />
      </div>

      <div className="content-grid two-column">
        <SectionCard className="dashboard-panel" kicker="Snapshot" title="Top organizers by event volume">
          <div className="dashboard-table">
            <div className="dashboard-table-head" style={{ gridTemplateColumns: '1.3fr 1fr .8fr' }}>
              <span>Organizer</span>
              <span>Email</span>
              <span>Events</span>
            </div>
            <div className="dashboard-table-body">
              {topAdmins.map((admin) => (
                <article className="dashboard-table-row" key={admin.id} style={{ gridTemplateColumns: '1.3fr 1fr .8fr' }}>
                  <div className="dashboard-cell-title">
                    <strong>{admin.name}</strong>
                  </div>
                  <span>{admin.email}</span>
                  <strong>{admin.events_posted}</strong>
                </article>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard className="dashboard-panel" kicker="Snapshot" title="Recent payments">
          <div className="dashboard-table">
            <div className="dashboard-table-head" style={{ gridTemplateColumns: '1fr .9fr .8fr' }}>
              <span>Buyer</span>
              <span>Reference</span>
              <span>Amount</span>
            </div>
            <div className="dashboard-table-body">
              {recentPayments.map((purchase) => (
                <article className="dashboard-table-row" key={purchase.id} style={{ gridTemplateColumns: '1fr .9fr .8fr' }}>
                  <div className="dashboard-cell-stack">
                    <strong>{purchase.buyer}</strong>
                    <span>{formatDateTime(purchase.paid_at)}</span>
                  </div>
                  <span>{purchase.payment_reference}</span>
                  <strong>{formatMoney(purchase.amount_cents)}</strong>
                </article>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard className="dashboard-panel" kicker="Snapshot" title="Recent event activity">
        <div className="dashboard-table">
          <div className="dashboard-table-head" style={{ gridTemplateColumns: '1.2fr .95fr 1.2fr .7fr .7fr' }}>
            <span>Event</span>
            <span>Organizer</span>
            <span>Venue and schedule</span>
            <span>Sold</span>
            <span>Status</span>
          </div>
          <div className="dashboard-table-body">
            {recentEvents.map((event) => (
              <article className="dashboard-table-row" key={event.id} style={{ gridTemplateColumns: '1.2fr .95fr 1.2fr .7fr .7fr' }}>
                <div className="dashboard-cell-title">
                  <strong>{event.title}</strong>
                  <span>{formatMoney(event.revenue_cents)}</span>
                </div>
                <span>{event.organizer || 'Unassigned'}</span>
                <div className="dashboard-cell-stack">
                  <span>{event.stadium}, {event.country}</span>
                  <span>{formatDate(event.event_date)} | {formatTime(event.start_time)} to {formatTime(event.end_time)}</span>
                </div>
                <strong>{event.tickets_sold}</strong>
                <span className={`dashboard-chip ${statusTone(event.status)}`}>{prettyStatus(event.status)}</span>
              </article>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function CrmCountriesPage({
  countryBusy,
  countryError,
  countryName,
  dashboard,
  onRemoveCountry,
  onSubmit,
  removingCountryId,
  setCountryError,
  setCountryName,
}) {
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false)

  if (!dashboard) {
    return <LoadingSection title="Loading countries" message="Fetching allowed event countries..." />
  }

  function openCountryModal() {
    setCountryError('')
    setIsCountryModalOpen(true)
  }

  function closeCountryModal() {
    if (countryBusy) {
      return
    }

    setCountryError('')
    setCountryName('')
    setIsCountryModalOpen(false)
  }

  async function handleCountryModalSubmit(event) {
    return onSubmit(event)
  }

  return (
    <>
      <SectionCard
        actions={
          <button className="primary-button" onClick={openCountryModal} type="button">
            Add country
          </button>
        }
        className="dashboard-panel"
        kicker="Country management"
        title="Allowed event countries"
      >
      <p className="dashboard-panel-copy">Only countries added here can be used by organizers while posting events.</p>

      <div className="dashboard-table">
        <div className="dashboard-table-head" style={{ gridTemplateColumns: '1.2fr .8fr .8fr .7fr' }}>
          <span>Country</span>
          <span>Stadiums</span>
          <span>Events</span>
          <span>Action</span>
        </div>
        <div className="dashboard-table-body">
          {dashboard.countries.map((country) => (
            <article className="dashboard-table-row" key={country.id} style={{ gridTemplateColumns: '1.2fr .8fr .8fr .7fr' }}>
              <div className="dashboard-cell-title">
                <strong>{country.name}</strong>
              </div>
              <span>{country.stadiums_count}</span>
              <span>{country.events_count}</span>
              <button
                className="inline-link danger"
                disabled={removingCountryId === country.id}
                onClick={() => onRemoveCountry(country)}
                type="button"
              >
                {removingCountryId === country.id ? 'Removing...' : 'Remove'}
              </button>
            </article>
          ))}
        </div>
      </div>
      </SectionCard>

      {isCountryModalOpen ? (
        <AppModal onClose={closeCountryModal} title="Add country">
          <form
            className="compact-form"
            onSubmit={async (event) => {
              const wasSaved = await handleCountryModalSubmit(event)
              if (wasSaved) {
                setIsCountryModalOpen(false)
              }
            }}
          >
            <input
              autoFocus
              onChange={(event) => {
                setCountryName(event.target.value)
                setCountryError('')
              }}
              placeholder="Enter country name"
              required
              type="text"
              value={countryName}
            />
            {countryError ? <p className="form-error inline-form-error">{countryError}</p> : null}
            <div className="modal-action-row">
              <button className="primary-button" disabled={countryBusy} type="submit">
                {countryBusy ? 'Adding...' : 'Save country'}
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}
    </>
  )
}

function CrmStadiumsPage({
  dashboard,
  onSubmit,
  onRemoveStadium,
  removingStadiumId,
  setStadiumError,
  setStadiumForm,
  stadiumBusy,
  stadiumError,
  stadiumForm,
}) {
  const [isStadiumModalOpen, setIsStadiumModalOpen] = useState(false)

  if (!dashboard) {
    return <LoadingSection title="Loading stadiums" message="Fetching stadium-to-country mappings..." />
  }

  function openStadiumModal() {
    setStadiumError('')
    setIsStadiumModalOpen(true)
  }

  function closeStadiumModal() {
    if (stadiumBusy) {
      return
    }

    setStadiumError('')
    setStadiumForm({ country_id: '', name: '' })
    setIsStadiumModalOpen(false)
  }

  async function handleStadiumModalSubmit(event) {
    return onSubmit(event)
  }

  return (
    <>
      <SectionCard
        actions={
          <button className="primary-button" onClick={openStadiumModal} type="button">
            Add stadium
          </button>
        }
        className="dashboard-panel"
        kicker="Stadium management"
        title="Country-linked venues"
      >
      <p className="dashboard-panel-copy">Map each stadium to a country so organizers only see valid venue options while creating events.</p>

      <div className="dashboard-table">
        <div className="dashboard-table-head" style={{ gridTemplateColumns: '1.2fr 1fr .8fr .7fr' }}>
          <span>Stadium</span>
          <span>Country</span>
          <span>Events</span>
          <span>Action</span>
        </div>
        <div className="dashboard-table-body">
          {dashboard.stadiums.map((stadium) => (
            <article className="dashboard-table-row" key={stadium.id} style={{ gridTemplateColumns: '1.2fr 1fr .8fr .7fr' }}>
              <div className="dashboard-cell-title">
                <strong>{stadium.name}</strong>
              </div>
              <span>{stadium.country.name}</span>
              <span>{stadium.events_count}</span>
              <button
                className="inline-link danger"
                disabled={removingStadiumId === stadium.id}
                onClick={() => onRemoveStadium(stadium)}
                type="button"
              >
                {removingStadiumId === stadium.id ? 'Removing...' : 'Remove'}
              </button>
            </article>
          ))}
        </div>
      </div>
      </SectionCard>

      {isStadiumModalOpen ? (
        <AppModal onClose={closeStadiumModal} title="Add stadium">
          <form
            className="compact-form"
            onSubmit={async (event) => {
              const wasSaved = await handleStadiumModalSubmit(event)
              if (wasSaved) {
                setIsStadiumModalOpen(false)
              }
            }}
          >
            <select
              autoFocus
              onChange={(event) => {
                setStadiumError('')
                setStadiumForm((current) => ({ ...current, country_id: event.target.value }))
              }}
              required
              value={stadiumForm.country_id}
            >
              <option value="">Select country</option>
              {dashboard.countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
            <input
              onChange={(event) => {
                setStadiumError('')
                setStadiumForm((current) => ({ ...current, name: event.target.value }))
              }}
              placeholder="Enter stadium name"
              required
              type="text"
              value={stadiumForm.name}
            />
            {stadiumError ? <p className="form-error inline-form-error">{stadiumError}</p> : null}
            <div className="modal-action-row">
              <button className="primary-button" disabled={stadiumBusy} type="submit">
                {stadiumBusy ? 'Adding...' : 'Save stadium'}
              </button>
            </div>
          </form>
        </AppModal>
      ) : null}
    </>
  )
}

function CrmAdminsPage({ dashboard }) {
  if (!dashboard) {
    return <LoadingSection title="Loading admins" message="Fetching organizer analytics..." />
  }

  const adminAnalytics = buildAdminAnalytics(dashboard)

  return (
    <div className="dashboard-page">
      <SectionCard className="dashboard-panel" kicker="Admin analytics" title="Registered admins and activity">
        <div className="dashboard-table">
          <div className="dashboard-table-head" style={{ gridTemplateColumns: '1.3fr 1fr .8fr .8fr .9fr' }}>
            <span>Organizer</span>
            <span>Email</span>
            <span>Events posted</span>
            <span>Tickets sold</span>
            <span>Revenue</span>
          </div>
          <div className="dashboard-table-body">
            {adminAnalytics.map((admin) => (
              <article className="dashboard-table-row" key={admin.id} style={{ gridTemplateColumns: '1.3fr 1fr .8fr .8fr .9fr' }}>
                <div className="dashboard-cell-title">
                  <strong>{admin.name}</strong>
                </div>
                <span>{admin.email}</span>
                <strong>{admin.events_posted}</strong>
                <strong>{admin.tickets_sold}</strong>
                <strong>{formatMoney(admin.revenue_cents)}</strong>
              </article>
            ))}
          </div>
        </div>
      </SectionCard>

      {adminAnalytics.map((admin) => (
        <article className="dashboard-subpanel" key={`analytics-${admin.id}`}>
          <div className="dashboard-subpanel-head">
            <div>
              <h3>{admin.name}</h3>
              <p>{admin.email}</p>
            </div>
            <div className="dashboard-inline-actions">
              <span className="dashboard-chip neutral">{admin.events_posted} events</span>
              <span className="dashboard-chip warning">{admin.tickets_sold} tickets sold</span>
              <span className="dashboard-chip success">{formatMoney(admin.revenue_cents)}</span>
            </div>
          </div>

          <div className="dashboard-table">
            <div className="dashboard-table-head" style={{ gridTemplateColumns: '1.2fr 1fr 1.3fr .7fr' }}>
              <span>Event</span>
              <span>Country</span>
              <span>Stadium, date and time</span>
              <span>Tickets sold</span>
            </div>
            <div className="dashboard-table-body">
              {admin.events.length ? (
                admin.events.map((event) => (
                  <article className="dashboard-table-row" key={event.id} style={{ gridTemplateColumns: '1.2fr 1fr 1.3fr .7fr' }}>
                    <div className="dashboard-cell-title">
                      <strong>{event.title}</strong>
                      <span className={`dashboard-chip ${statusTone(event.status)}`}>{prettyStatus(event.status)}</span>
                    </div>
                    <span>{event.country}</span>
                    <div className="dashboard-cell-stack">
                      <span>{event.stadium}</span>
                      <span>{formatDate(event.event_date)} | {formatTime(event.start_time)} to {formatTime(event.end_time)}</span>
                    </div>
                    <strong>{event.tickets_sold}</strong>
                  </article>
                ))
              ) : (
                <article className="dashboard-table-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span>No events posted yet by this admin.</span>
                </article>
              )}
            </div>
          </div>

          <div className="dashboard-table">
            <div className="dashboard-table-head" style={{ gridTemplateColumns: '1fr 1fr .9fr .8fr' }}>
              <span>Purchaser</span>
              <span>Event / ticket</span>
              <span>Payment reference</span>
              <span>Amount</span>
            </div>
            <div className="dashboard-table-body">
              {admin.tickets.length ? (
                admin.tickets.map((ticket) => (
                  <article className="dashboard-table-row" key={ticket.id} style={{ gridTemplateColumns: '1fr 1fr .9fr .8fr' }}>
                    <div className="dashboard-cell-stack">
                      <strong>{ticket.buyer}</strong>
                      <span>{ticket.buyer_email}</span>
                      <span>{formatDateTime(ticket.purchased_at)}</span>
                    </div>
                    <div className="dashboard-cell-stack">
                      <span>{ticket.event_title}</span>
                      <span>{ticket.ticket_code}</span>
                    </div>
                    <span>{ticket.payment_reference}</span>
                    <strong>{formatMoney(ticket.amount_cents)}</strong>
                  </article>
                ))
              ) : (
                <article className="dashboard-table-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span>No ticket purchases recorded for this admin yet.</span>
                </article>
              )}
            </div>
          </div>

          <div className="dashboard-table">
            <div className="dashboard-table-head" style={{ gridTemplateColumns: '1fr 1fr .9fr .8fr' }}>
              <span>Buyer</span>
              <span>Purchase events</span>
              <span>Payment details</span>
              <span>Total</span>
            </div>
            <div className="dashboard-table-body">
              {admin.purchases.length ? (
                admin.purchases.map((purchase) => (
                  <article className="dashboard-table-row" key={purchase.id} style={{ gridTemplateColumns: '1fr 1fr .9fr .8fr' }}>
                    <div className="dashboard-cell-stack">
                      <strong>{purchase.buyer}</strong>
                      <span>{purchase.buyer_email}</span>
                    </div>
                    <div className="dashboard-cell-stack">
                      {purchase.items.map((item) => (
                        <span key={`${purchase.id}-${item.event_id}`}>{item.event_title} x {item.quantity}</span>
                      ))}
                    </div>
                    <div className="dashboard-cell-stack">
                      <span>{purchase.payment_reference}</span>
                      <span>{formatDateTime(purchase.paid_at)}</span>
                    </div>
                    <strong>{formatMoney(purchase.amount_cents)}</strong>
                  </article>
                ))
              ) : (
                <article className="dashboard-table-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span>No paid purchases recorded for this admin yet.</span>
                </article>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function CrmEventsPage({ dashboard }) {
  if (!dashboard) {
    return <LoadingSection title="Loading event ledger" message="Fetching event schedules and sales..." />
  }

  return (
    <SectionCard className="dashboard-panel" kicker="Event ledger" title="Event schedule and sales">
      <div className="dashboard-table">
        <div className="dashboard-table-head" style={{ gridTemplateColumns: '1.2fr .95fr 1.2fr .7fr .7fr' }}>
          <span>Event</span>
          <span>Organizer</span>
          <span>Venue and schedule</span>
          <span>Tickets sold</span>
          <span>Status</span>
        </div>
        <div className="dashboard-table-body">
          {dashboard.events.map((event) => (
            <article className="dashboard-table-row" key={event.id} style={{ gridTemplateColumns: '1.2fr .95fr 1.2fr .7fr .7fr' }}>
              <div className="dashboard-cell-title">
                <strong>{event.title}</strong>
                <span>{formatMoney(event.revenue_cents)}</span>
              </div>
              <span>{event.organizer || 'Unassigned'}</span>
              <div className="dashboard-cell-stack">
                <span>{event.stadium}, {event.country}</span>
                <span>{formatDate(event.event_date)} | {formatTime(event.start_time)} to {formatTime(event.end_time)}</span>
              </div>
              <strong>{event.tickets_sold}</strong>
              <span className={`dashboard-chip ${statusTone(event.status)}`}>{prettyStatus(event.status)}</span>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

function CrmPaymentsPage({ dashboard }) {
  if (!dashboard) {
    return <LoadingSection title="Loading payments" message="Fetching payment records..." />
  }

  return (
    <SectionCard className="dashboard-panel" kicker="Purchases" title="Payment records">
      <div className="dashboard-table">
        <div className="dashboard-table-head" style={{ gridTemplateColumns: '1fr 1fr .9fr .8fr' }}>
          <span>Buyer</span>
          <span>Events</span>
          <span>Payment reference</span>
          <span>Amount</span>
        </div>
        <div className="dashboard-table-body">
          {dashboard.purchases.map((purchase) => (
            <article className="dashboard-table-row" key={purchase.id} style={{ gridTemplateColumns: '1fr 1fr .9fr .8fr' }}>
              <div className="dashboard-cell-stack">
                <strong>{purchase.buyer}</strong>
                <span>{purchase.buyer_email}</span>
                <span>{formatDateTime(purchase.paid_at)}</span>
              </div>
              <span>{purchase.items.map((item) => item.event_title).join(', ')}</span>
              <span>{purchase.payment_reference}</span>
              <strong>{formatMoney(purchase.amount_cents)}</strong>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

function CrmTicketsPage({ dashboard }) {
  if (!dashboard) {
    return <LoadingSection title="Loading tickets" message="Fetching issued ticket records..." />
  }

  return (
    <SectionCard className="dashboard-panel" kicker="Ticket audit" title="Issued tickets">
      <div className="dashboard-table">
        <div className="dashboard-table-head" style={{ gridTemplateColumns: '1fr .9fr .9fr .8fr' }}>
          <span>Event</span>
          <span>Buyer</span>
          <span>Ticket and payment</span>
          <span>Amount</span>
        </div>
        <div className="dashboard-table-body">
          {dashboard.tickets.map((ticket) => (
            <article className="dashboard-table-row" key={ticket.id} style={{ gridTemplateColumns: '1fr .9fr .9fr .8fr' }}>
              <div className="dashboard-cell-title">
                <strong>{ticket.event_title}</strong>
                <span>{formatDateTime(ticket.purchased_at)}</span>
              </div>
              <div className="dashboard-cell-stack">
                <strong>{ticket.buyer}</strong>
                <span>{ticket.buyer_email}</span>
              </div>
              <div className="dashboard-cell-stack">
                <span>{ticket.ticket_code}</span>
                <span>{ticket.payment_reference}</span>
              </div>
              <strong>{formatMoney(ticket.amount_cents)}</strong>
            </article>
          ))}
        </div>
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

function buildAdminAnalytics(dashboard) {
  const eventsByAdmin = new Map()
  const ticketsByAdmin = new Map()
  const purchasesByAdmin = new Map()

  dashboard.events.forEach((event) => {
    if (!event.admin_id) {
      return
    }

    const entries = eventsByAdmin.get(event.admin_id) ?? []
    entries.push(event)
    eventsByAdmin.set(event.admin_id, entries)
  })

  dashboard.tickets.forEach((ticket) => {
    if (!ticket.admin_id) {
      return
    }

    const entries = ticketsByAdmin.get(ticket.admin_id) ?? []
    entries.push(ticket)
    ticketsByAdmin.set(ticket.admin_id, entries)
  })

  dashboard.purchases.forEach((purchase) => {
    const groupedItems = new Map()

    purchase.items.forEach((item) => {
      if (!item.admin_id) {
        return
      }

      const existingPurchase = groupedItems.get(item.admin_id) ?? {
        ...purchase,
        items: [],
      }

      existingPurchase.items.push(item)
      groupedItems.set(item.admin_id, existingPurchase)
    })

    groupedItems.forEach((groupedPurchase, adminId) => {
      const entries = purchasesByAdmin.get(adminId) ?? []
      entries.push(groupedPurchase)
      purchasesByAdmin.set(adminId, entries)
    })
  })

  return dashboard.admins.map((admin) => {
    const events = [...(eventsByAdmin.get(admin.id) ?? [])].sort((left, right) => {
      const leftDate = `${left.event_date ?? ''} ${left.start_time ?? ''}`
      const rightDate = `${right.event_date ?? ''} ${right.start_time ?? ''}`
      return leftDate.localeCompare(rightDate)
    })
    const tickets = [...(ticketsByAdmin.get(admin.id) ?? [])]
    const purchases = [...(purchasesByAdmin.get(admin.id) ?? [])]
    const revenue_cents = purchases.reduce((total, purchase) => total + purchase.items.reduce((sum, item) => sum + item.subtotal_cents, 0), 0)

    return {
      ...admin,
      events,
      tickets,
      purchases,
      tickets_sold: tickets.length,
      revenue_cents,
    }
  })
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
