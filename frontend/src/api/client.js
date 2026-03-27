import axios from 'axios'

let authToken = null

export const api = axios.create({
  baseURL: '/api',
  headers: {
    Accept: 'application/json',
  },
})

export function setAuthToken(token) {
  authToken = token || null
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }

  return config
})

export function apiMessage(error, fallback = 'Something went wrong.') {
  const payload = error?.response?.data

  if (!payload) {
    return error?.message || fallback
  }

  if (payload.errors) {
    return Object.values(payload.errors).flat().join(' ')
  }

  if (typeof payload.message === 'string') {
    return payload.message
  }

  return fallback
}
