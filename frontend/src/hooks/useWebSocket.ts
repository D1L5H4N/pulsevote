import { useEffect, useRef, useCallback } from 'react'
import { ResultsResponse } from '../services/api'

// In development, Vite proxy forwards /ws to localhost:8080.
// In production, use VITE_WS_URL pointing to the Render backend.
const WS_BASE = import.meta.env.VITE_WS_URL || ''

interface UseWebSocketOptions {
  pollId: string
  onMessage: (data: ResultsResponse) => void
  enabled?: boolean
}

/**
 * useWebSocket connects to the Go WebSocket endpoint for a specific poll
 * and calls onMessage whenever new results arrive.
 *
 * Connection lifecycle:
 *   - Connects when `enabled` is true
 *   - Automatically reconnects with exponential backoff on unexpected close
 *   - Sends pong responses to server ping frames (handled by the browser WS API)
 *   - Cleans up on component unmount
 *
 * The server pushes a ResultsResponse JSON payload whenever a vote is recorded.
 */
export function useWebSocket({ pollId, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef         = useRef<WebSocket | null>(null)
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retriesRef    = useRef(0)
  const onMessageRef  = useRef(onMessage)
  const enabledRef    = useRef(enabled)

  // Keep refs up to date so closures always call the latest callback
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const connect = useCallback(() => {
    if (!enabledRef.current || !pollId) return

    const url = `${WS_BASE}/ws/polls/${pollId}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      retriesRef.current = 0 // reset backoff on successful connection
    }

    ws.onmessage = (event) => {
      try {
        const data: ResultsResponse = JSON.parse(event.data)
        onMessageRef.current(data)
      } catch {
        // Silently ignore malformed messages
      }
    }

    ws.onclose = (event) => {
      // 1000 = normal close (server-side cleanup); don't reconnect
      if (event.code === 1000 || !enabledRef.current) return

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30_000)
      retriesRef.current++
      reconnectRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      // onclose will fire after onerror — reconnect logic is there
      ws.close()
    }
  }, [pollId])

  useEffect(() => {
    if (!enabled) return
    connect()

    return () => {
      // Clean up on unmount
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close(1000, 'component unmounted')
      }
    }
  }, [enabled, connect])
}
