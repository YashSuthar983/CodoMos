import { useEffect, useRef, useState } from 'react'

// fullApiBase: e.g. http://127.0.0.1:8000/api/v1
export default function useMessagingWS(fullApiBase, userEmail) {
  const [events, setEvents] = useState([])
  const wsRef = useRef(null)

  useEffect(() => {
    if (!userEmail || !fullApiBase) return
    const base = fullApiBase.replace(/\/?api\/v1\/?$/, '')
    const url = `${base}/api/v1/messaging/ws?token=${encodeURIComponent(userEmail)}`
    const wsUrl = url.replace('http://', 'ws://').replace('https://', 'wss://')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setEvents((prev) => [data, ...prev].slice(0, 200))
      } catch {
        // ignore parse errors
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [fullApiBase, userEmail])

  const joinChannel = (channelId) => {
    try {
      wsRef.current?.send(JSON.stringify({ action: 'join_channel', channelId }))
    } catch {}
  }

  return { events, joinChannel }
}
