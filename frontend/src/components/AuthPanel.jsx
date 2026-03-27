import { useState } from 'react'
import { apiMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'

export function AuthPanel({ role, title, subtitle, allowRegistration = false }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (mode === 'register') {
        await register({
          ...form,
          role,
        })
      } else {
        await login({
          email: form.email,
          password: form.password,
          role,
        })
      }
    } catch (requestError) {
      setError(apiMessage(requestError, 'Authentication failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  return (
    <div className="auth-panel">
      <div className="auth-copy">
        <p className="section-kicker">Portal access</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {allowRegistration ? (
          <div className="toggle-row">
            <button
              className={mode === 'login' ? 'toggle-chip is-active' : 'toggle-chip'}
              onClick={() => setMode('login')}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === 'register' ? 'toggle-chip is-active' : 'toggle-chip'}
              onClick={() => setMode('register')}
              type="button"
            >
              Register
            </button>
          </div>
        ) : null}

        {mode === 'register' ? (
          <label>
            Full name
            <input onChange={(event) => updateField('name', event.target.value)} required type="text" value={form.name} />
          </label>
        ) : null}

        <label>
          Email
          <input onChange={(event) => updateField('email', event.target.value)} required type="email" value={form.email} />
        </label>

        <label>
          Password
          <input
            onChange={(event) => updateField('password', event.target.value)}
            required
            type="password"
            value={form.password}
          />
        </label>

        {mode === 'register' ? (
          <label>
            Confirm password
            <input
              onChange={(event) => updateField('password_confirmation', event.target.value)}
              required
              type="password"
              value={form.password_confirmation}
            />
          </label>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Working...' : mode === 'register' ? 'Create account' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
