import { useDispatch, useSelector } from 'react-redux'
import { clearCart, removeItem, selectCartCount, selectCartItems, selectCartTotal, setQuantity } from '../app/cartSlice'
import { formatDate, formatMoney, formatTime } from '../lib/format'

export function CartPanel({ canCheckout, checkoutBusy, onCheckout }) {
  const dispatch = useDispatch()
  const items = useSelector(selectCartItems)
  const count = useSelector(selectCartCount)
  const total = useSelector(selectCartTotal)

  return (
    <div className="cart-panel">
      <div className="section-head">
        <div>
          <p className="section-kicker">Redux cart</p>
          <h2>Your booking basket</h2>
        </div>
        <div className="cart-head-actions">
          <span className="cart-count-pill">{count} ticket{count === 1 ? '' : 's'}</span>
          {items.length ? (
            <button className="ghost-button" onClick={() => dispatch(clearCart())} type="button">
              Clear basket
            </button>
          ) : null}
        </div>
      </div>

      {items.length ? (
        <>
          <div className="cart-list">
            {items.map((item) => (
              <article className="cart-item" key={item.event_id}>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.stadium}, {item.country}
                  </p>
                  <span>
                    {formatDate(item.event_date)} at {formatTime(item.start_time)}
                  </span>
                </div>

                <div className="cart-controls">
                  <div className="quantity-controls">
                    <button
                      onClick={() => dispatch(setQuantity({ eventId: item.event_id, quantity: item.quantity - 1 }))}
                      type="button"
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => dispatch(setQuantity({ eventId: item.event_id, quantity: item.quantity + 1 }))}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <strong>{formatMoney(item.quantity * item.price_cents)}</strong>
                  <button className="inline-link" onClick={() => dispatch(removeItem(item.event_id))} type="button">
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="checkout-box">
            <div className="checkout-copy">
              <span>Total payable</span>
              <strong>{formatMoney(total)}</strong>
              <p>Inventory stays synced with live event availability.</p>
            </div>
            <button className="primary-button" disabled={!canCheckout || checkoutBusy} onClick={onCheckout} type="button">
              {checkoutBusy ? 'Redirecting...' : 'Checkout'}
            </button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p>Pick one or more events to test the multi-event checkout flow.</p>
        </div>
      )}
    </div>
  )
}
