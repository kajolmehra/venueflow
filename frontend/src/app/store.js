import { configureStore } from '@reduxjs/toolkit'
import { cartReducer } from './cartSlice'

const CART_KEY = 'venueflow-cart'

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
  preloadedState: {
    cart: {
      items: loadCart(),
    },
  },
})

store.subscribe(() => {
  localStorage.setItem(CART_KEY, JSON.stringify(store.getState().cart.items))
})
