import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { api, apiMessage } from '../api/client'
import { clearCart } from '../app/cartSlice'
import { useAuth } from '../auth/useAuth'
import { PortalShell } from '../components/PortalShell'
import { SectionCard } from '../components/SectionCard'
import { formatDate, formatDateTime, formatMoney, formatTime } from '../lib/format'

export function CheckoutSuccessPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId || user?.role !== 'user') {
      return
    }

    api
      .get('/checkout/success', {
        params: {
          session_id: sessionId,
        },
      })
      .then(({ data }) => {
        setOrder(data.order)
        dispatch(clearCart())
      })
      .catch((requestError) => {
        setError(apiMessage(requestError, 'Payment confirmation could not be completed.'))
      })
  }, [dispatch, sessionId, user])

  return (
    <PortalShell
      eyebrow="Checkout"
      subtitle="This page finalizes the Stripe session and stores ticket, buyer, and payment details in Laravel."
      title="Payment confirmation"
    >
      {error ? <p className="feedback-strip error">{error}</p> : null}

      {!sessionId ? (
        <SectionCard title="Missing checkout session">
          <p>Open this page through a completed checkout redirect so the backend can confirm the purchase.</p>
        </SectionCard>
      ) : user?.role !== 'user' ? (
        <SectionCard title="Customer session required">
          <p>Login with a customer account first, then reopen the success URL to finish ticket issuance.</p>
        </SectionCard>
      ) : order ? (
        <div className="content-grid two-column">
          <SectionCard kicker="Order summary" title={`Order #${order.id}`}>
            <div className="stack-list">
              {order.items.map((item) => (
                <article className="ledger-row" key={`${item.event_title}-${item.start_time}`}>
                  <div>
                    <h3>{item.event_title}</h3>
                    <p>
                      {item.stadium_name}, {item.country_name}
                    </p>
                    <span>
                      {formatDate(item.event_date)} | {formatTime(item.start_time)}
                    </span>
                  </div>
                  <div className="meta-column">
                    <strong>{item.quantity} tickets</strong>
                    <span>{formatMoney(item.subtotal_cents)}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="checkout-box">
              <div>
                <span>{order.payment_reference}</span>
                <span>{formatDateTime(order.paid_at)}</span>
                <strong>{formatMoney(order.amount_cents)}</strong>
              </div>
              <Link className="primary-button" to="/events">
                Back to events
              </Link>
            </div>
          </SectionCard>

          <SectionCard kicker="Issued tickets" title="Ticket codes">
            <div className="stack-list">
              {order.tickets.map((ticket) => (
                <article className="ledger-row" key={ticket.ticket_code}>
                  <div>
                    <h3>{ticket.event_title}</h3>
                    <p>{ticket.buyer}</p>
                  </div>
                  <div className="meta-column">
                    <strong>{ticket.ticket_code}</strong>
                    <span>{ticket.buyer_email}</span>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : (
        <SectionCard title="Finalizing purchase">
          <p>Confirming the checkout session and issuing tickets...</p>
        </SectionCard>
      )}
    </PortalShell>
  )
}
