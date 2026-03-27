import { useEffect, useEffectEvent } from 'react'
import { getEcho } from '../realtime/echo'

export function useRealtimeChannel({
  channel,
  enabled = true,
  event,
  onMessage,
  token = '',
  type = 'public',
}) {
  const handleMessage = useEffectEvent((payload) => {
    onMessage?.(payload)
  })

  useEffect(() => {
    if (!enabled || !channel || !event) {
      return undefined
    }

    let active = true
    let leaveChannel = null
    let echoClient = null

    ;(async () => {
      const echo = await getEcho(token)

      if (!active || !echo) {
        return
      }

      echoClient = echo
      const subscription = type === 'private' ? echo.private(channel) : echo.channel(channel)
      leaveChannel = type === 'private' ? `private-${channel}` : channel

      subscription.listen(`.${event}`, handleMessage)
    })()

    return () => {
      active = false

      if (leaveChannel && echoClient) {
        echoClient.leave(leaveChannel)
      }
    }
  }, [channel, enabled, event, handleMessage, token, type])
}
