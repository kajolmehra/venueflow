import { useEffect, useState } from 'react'
import { api, setAuthToken } from '../api/client'
import { disconnectEcho } from '../realtime/echo'
import { AuthContext } from './context'

const STORAGE_KEY = 'venueflow-auth'
const emptySession = {
  token: '',
  user: null,
}

function readSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : emptySession
  } catch {
    return emptySession
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)
  const [authAction, setAuthAction] = useState('')

  setAuthToken(session.token)

  useEffect(() => {
    if (session.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      return
    }

    disconnectEcho()
    localStorage.removeItem(STORAGE_KEY)
  }, [session])

  async function login(payload) {
    setAuthAction('login')

    try {
      const { data } = await api.post('/auth/login', payload)
      setSession({
        token: data.token,
        user: data.user,
      })

      return data
    } finally {
      setAuthAction('')
    }
  }

  async function register(payload) {
    setAuthAction('register')

    try {
      const { data } = await api.post('/auth/register', payload)
      setSession({
        token: data.token,
        user: data.user,
      })

      return data
    } finally {
      setAuthAction('')
    }
  }

  async function logout() {
    const activeToken = session.token
    setAuthAction('logout')

    try {
      if (activeToken) {
        await api.post(
          '/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          },
        )
      }
    } finally {
      setSession(emptySession)
      setAuthAction('')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token: session.token,
        user: session.user,
        isLoggedIn: Boolean(session.token && session.user),
        authAction,
        isAuthenticating: authAction === 'login' || authAction === 'register',
        isLoggingOut: authAction === 'logout',
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
