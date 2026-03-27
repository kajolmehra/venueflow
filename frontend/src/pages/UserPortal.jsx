import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { api, apiMessage } from '../api/client'
import { addItem, selectCartItems, syncCatalog } from '../app/cartSlice'
import { useAuth } from '../auth/useAuth'
import { AuthPanel } from '../components/AuthPanel'
import { CartPanel } from '../components/CartPanel'
import { PortalShell } from '../components/PortalShell'
import { SectionCard } from '../components/SectionCard'
import { useRealtimeChannel } from '../hooks/useRealtimeChannel'
import { formatDate, formatMoney, formatTime } from '../lib/format'

export function UserPortal() {
  const dispatch = useDispatch()
  const items = useSelector(selectCartItems)
  const { user } = useAuth()
  const [payload, setPayload] = useState(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [isRealtimeReady, setIsRealtimeReady] = useState(false)
  const [filters, setFilters] = useState({
    stadium_id: '',
    date: '',
    time: '',
  })
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [error, setError] = useState('')

  const loadEvents = useEffectEvent(async () => {
    setCatalogLoading(true)

    try {
      const { data } = await api.get('/events')
      setPayload(data)
      setError('')
      dispatch(syncCatalog(data.events))
    } catch (requestError) {
      setError(apiMessage(requestError, 'Events could not be loaded.'))
    } finally {
      setCatalogLoading(false)
      setIsRealtimeReady(true)
    }
  })

  useEffect(() => {
    loadEvents()
  }, [])

  useRealtimeChannel({
    channel: 'events.public',
    enabled: isRealtimeReady,
    event: 'public-events.synced',
    onMessage: (streamPayload) => {
      startTransition(() => {
        setPayload((current) => ({
          events: streamPayload.events,
          filters: streamPayload.filters || current?.filters || { countries: [], stadiums: [] },
          server_time: current?.server_time,
        }))
      })

      setCatalogLoading(false)
      dispatch(syncCatalog(streamPayload.events))
    },
  })

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function resetFilters() {
    setFilters({
      stadium_id: '',
      date: '',
      time: '',
    })
  }

  async function handleCheckout() {
    if (user?.role !== 'user') {
      setError('Login with a customer account to continue to checkout.')
      return
    }

    setCheckoutBusy(true)
    setError('')

    try {
      const { data } = await api.post('/checkout/session', {
        items: items.map((item) => ({
          event_id: item.event_id,
          quantity: item.quantity,
        })),
        success_url: `${window.location.origin}/checkout/success`,
        cancel_url: `${window.location.origin}/events`,
      })

      window.location.assign(data.checkout.checkout_url)
    } catch (requestError) {
      setError(apiMessage(requestError, 'Checkout could not be started.'))
      setCheckoutBusy(false)
    }
  }

  const stadiums = payload?.filters?.stadiums || []
  const selectedStadiumName = stadiums.find((stadium) => String(stadium.id) === String(filters.stadium_id))?.name || ''
  const events = (payload?.events || []).filter((event) => matchesRequiredFilters(event, filters, selectedStadiumName))
  const stadiumOptionsLoading = catalogLoading && stadiums.length === 0
  const hasFilters = Boolean(filters.stadium_id || filters.date || filters.time)

  return (
    <PortalShell
      eyebrow="User application"
      showHero={false}
      subtitle="Register or login, browse events, filter by stadium, date, and time, add tickets to cart, and complete Stripe test checkout."
      title="Event booking"
    >
      {error ? <p className="feedback-strip error">{error}</p> : null}

      <div className="content-grid booking-layout">
        <div className="booking-main">
          <SectionCard
            actions={
              hasFilters ? (
                <button className="ghost-button" onClick={resetFilters} type="button">
                  Reset filters
                </button>
              ) : null
            }
            kicker="Filter events"
            title="Available events"
          >
            {stadiumOptionsLoading ? <p className="loading-hint">Loading stadiums...</p> : null}

            <div className="filter-grid booking-basic-filter-grid">
              <label>
                Stadium
                <select
                  disabled={stadiumOptionsLoading}
                  onChange={(event) => updateFilter('stadium_id', event.target.value)}
                  value={filters.stadium_id}
                >
                  <option value="">
                    {stadiumOptionsLoading ? 'Loading stadiums...' : stadiums.length ? 'All stadiums' : 'No stadiums found'}
                  </option>
                  {stadiums.map((stadium) => (
                    <option key={stadium.id} value={stadium.id}>
                      {stadium.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input onChange={(event) => updateFilter('date', event.target.value)} type="date" value={filters.date} />
              </label>

              <label>
                Time
                <input onChange={(event) => updateFilter('time', event.target.value)} type="time" value={filters.time} />
              </label>
            </div>

            <div className="event-preview-grid">
              {catalogLoading && !events.length ? (
                <div className="empty-state">
                  <h3>Loading live events</h3>
                  <p>Please wait while we fetch the current event catalog.</p>
                </div>
              ) : null}

              {!catalogLoading && !events.length ? (
                <div className="empty-state">
                  <h3>No events found</h3>
                  <p>Try changing the stadium, date, or time filter.</p>
                </div>
              ) : null}

              {events.map((event) => {
                const soldPercent = getSoldPercent(event)
                const dateBadge = getDateBadge(event.event_date)

                return (
                  <article className="show-card" key={event.id}>
                    <div className="show-card-banner">
                      <div className="show-date-pill">
                        <strong>{dateBadge.day}</strong>
                        <span>{dateBadge.month}</span>
                      </div>
                      <span className={event.is_sellable ? 'status-badge inventory' : 'status-badge danger'}>
                        {event.is_sellable ? `${event.available_tickets} seats left` : 'Sales stopped'}
                      </span>
                    </div>

                    <div className="show-card-body">
                      <div className="show-card-head">
                        <div>
                          <p className="show-card-kicker">{event.organizer || 'Organizer'}</p>
                          <h3>{event.title}</h3>
                          <p className="muted-copy">
                            {event.stadium}, {event.country}
                          </p>
                        </div>
                      </div>

                      <p className="muted-copy show-card-description">{event.description}</p>

                      <div className="show-chip-row">
                        <span className="show-chip">{formatDate(event.event_date)}</span>
                        <span className="show-chip">{formatTime(event.start_time)} to {formatTime(event.end_time)}</span>
                        <span className="show-chip">{event.total_tickets} total tickets</span>
                      </div>

                      <div className="show-progress-block">
                        <div className="show-progress-meta">
                          <span>{event.sold_tickets} sold</span>
                          <span>{event.available_tickets} left</span>
                        </div>
                        <div className="show-progress-track">
                          <span style={{ width: `${soldPercent}%` }} />
                        </div>
                      </div>

                      <div className="show-card-footer">
                        <div className="show-price">
                          <span>Ticket price</span>
                          <strong>{formatMoney(event.price_cents)}</strong>
                        </div>

                        <button
                          className="primary-button"
                          disabled={!event.is_sellable}
                          onClick={() =>
                            dispatch(
                              addItem({
                                event_id: event.id,
                                title: event.title,
                                country: event.country,
                                stadium: event.stadium,
                                event_date: event.event_date,
                                start_time: event.start_time,
                                price_cents: event.price_cents,
                                available_tickets: event.available_tickets,
                              }),
                            )
                          }
                          type="button"
                        >
                          {event.is_sellable ? 'Add to cart' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </SectionCard>
        </div>

        <aside className="booking-side">
          {!user || user.role !== 'user' ? (
            <SectionCard kicker="Access" title="Customer sign-in">
              {!user ? (
                <AuthPanel
                  allowRegistration
                  role="user"
                  subtitle="Use booker@venueflow.test / Password123! or register a new customer account."
                  title="Customer login"
                />
              ) : (
                <p className="muted-copy">You're logged in as <strong>{user.role.replace('_', ' ')}</strong>. Switch to a customer account to test the booking flow.</p>
              )}
            </SectionCard>
          ) : null}

          <CartPanel canCheckout={Boolean(items.length && user?.role === 'user')} checkoutBusy={checkoutBusy} onCheckout={handleCheckout} />
        </aside>
      </div>
    </PortalShell>
  )
}

function matchesRequiredFilters(event, filters, selectedStadiumName) {
  if (filters.stadium_id && selectedStadiumName && String(event.stadium) !== String(selectedStadiumName)) {
    return false
  }

  if (filters.date && String(event.event_date) !== String(filters.date)) {
    return false
  }

  if (filters.time) {
    const time = String(filters.time)

    if (String(event.start_time) > time || String(event.end_time) < time) {
      return false
    }
  }

  return true
}

function getDateBadge(value) {
  if (!value) {
    return {
      day: '--',
      month: 'TBD',
    }
  }

  const date = new Date(value)

  return {
    day: new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date).toUpperCase(),
  }
}

function getSoldPercent(event) {
  const total = Number(event.total_tickets) || 0
  const sold = Number(event.sold_tickets) || 0

  if (!total) {
    return 0
  }

  return Math.min(100, Math.round((sold / total) * 100))
}
