import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items: [],
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action) {
      const event = action.payload
      const existing = state.items.find((item) => item.event_id === event.event_id)

      if (existing) {
        existing.quantity = Math.min(existing.quantity + 1, existing.available_tickets || existing.quantity + 1)
        existing.available_tickets = event.available_tickets
        existing.price_cents = event.price_cents
        return
      }

      state.items.push({
        ...event,
        quantity: 1,
      })
    },
    setQuantity(state, action) {
      const { eventId, quantity } = action.payload
      const item = state.items.find((entry) => entry.event_id === eventId)

      if (!item) {
        return
      }

      if (quantity <= 0) {
        state.items = state.items.filter((entry) => entry.event_id !== eventId)
        return
      }

      item.quantity = Math.min(quantity, item.available_tickets || quantity)
    },
    removeItem(state, action) {
      state.items = state.items.filter((entry) => entry.event_id !== action.payload)
    },
    clearCart(state) {
      state.items = []
    },
    syncCatalog(state, action) {
      const eventsById = new Map(action.payload.map((event) => [event.id, event]))

      state.items = state.items
        .map((item) => {
          const next = eventsById.get(item.event_id)

          if (!next || !next.is_sellable) {
            return null
          }

          return {
            ...item,
            title: next.title,
            country: next.country,
            stadium: next.stadium,
            event_date: next.event_date,
            start_time: next.start_time,
            price_cents: next.price_cents,
            available_tickets: next.available_tickets,
            quantity: Math.min(item.quantity, next.available_tickets),
          }
        })
        .filter(Boolean)
    },
  },
})

export const { addItem, setQuantity, removeItem, clearCart, syncCatalog } = cartSlice.actions

export const cartReducer = cartSlice.reducer

export const selectCartItems = (state) => state.cart.items
export const selectCartCount = (state) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0)
export const selectCartTotal = (state) => state.cart.items.reduce((sum, item) => sum + item.quantity * item.price_cents, 0)
