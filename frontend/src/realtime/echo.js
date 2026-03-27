import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echoInstance = null
let activeToken = '__public__'
let runtimeConfigPromise = null

async function loadRuntimeConfig() {
  if (runtimeConfigPromise) {
    return runtimeConfigPromise
  }

  runtimeConfigPromise = (async () => {
    const envKey = import.meta.env.VITE_REVERB_APP_KEY

    if (envKey) {
      return {
        key: envKey,
        host: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
        port: Number(import.meta.env.VITE_REVERB_PORT || 8080),
        scheme: import.meta.env.VITE_REVERB_SCHEME || 'http',
      }
    }

    try {
      const response = await fetch('/api/realtime/config', {
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        return null
      }

      const payload = await response.json()

      if (!payload?.key) {
        return null
      }

      return {
        key: payload.key,
        host: payload.host || window.location.hostname,
        port: Number(payload.port || 8080),
        scheme: payload.scheme || 'http',
      }
    } catch {
      return null
    }
  })()

  return runtimeConfigPromise
}

function reverbConfig(runtimeConfig, token = '') {
  const scheme = runtimeConfig.scheme || 'http'

  return {
    broadcaster: 'reverb',
    key: runtimeConfig.key,
    wsHost: runtimeConfig.host || window.location.hostname,
    wsPort: Number(runtimeConfig.port || 8080),
    wssPort: Number(runtimeConfig.port || 8080),
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          }
        : {
            Accept: 'application/json',
          },
    },
  }
}

export async function getEcho(token = '') {
  const runtimeConfig = await loadRuntimeConfig()

  if (!runtimeConfig?.key) {
    return null
  }

  const nextToken = token || '__public__'

  if (echoInstance && activeToken === nextToken) {
    return echoInstance
  }

  if (echoInstance) {
    echoInstance.disconnect()
  }

  window.Pusher = Pusher

  echoInstance = new Echo(reverbConfig(runtimeConfig, token))
  activeToken = nextToken

  return echoInstance
}

export function disconnectEcho() {
  if (!echoInstance) {
    return
  }

  echoInstance.disconnect()
  echoInstance = null
  activeToken = '__public__'
}
