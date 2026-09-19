import { useEffect, useRef, useState, useCallback } from 'react'
import { ResultsResponse } from '../services/api'

interface UseWebSocketOptions {
  pollId?: string
  endpoint?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage: (data: any) => void
  enabled?: boolean
}

function getWsUrl(pollId?: string, endpoint?: string): string {
  const token = localStorage.getItem('pulsevote_token') || ''
  let path = endpoint || `/ws/polls/${pollId}`
  if (endpoint && token) {
    path = `${endpoint}?token=${encodeURIComponent(token)}`
  }

  // 1. Explicit WS URL (e.g. from .env.production)
  if (import.meta.env.VITE_WS_URL) {
    const base = import.meta.env.VITE_WS_URL.replace(/\/$/, '')
    return `${base}${path}`
  }

  // 2. Derive from API URL if set
  if (import.meta.env.VITE_API_URL) {
    const wsBase = import.meta.env.VITE_API_URL.replace(/^http/, 'ws').replace(/\/$/, '')
    return `${wsBase}${path}`
  }

  // 3. Fallback to same host with ws/wss protocol (local development with Vite proxy)
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}${path}`
  }

  return path
}

/**
 * useWebSocket connects to the Go WebSocket endpoint for a specific poll
 * and calls onMessage whenever new results arrive.
 *
 * Connection lifecycle:
 *   - Connects when `enabled` is true
 *   - Updates `isConnected` immediately upon onopen / onclose
 *   - Automatically reconnects with exponential backoff on unexpected close
 *   - Sends pong responses to server ping frames (handled by the browser WS API)
 *   - Cleans up on component unmount
 */
export function useWebSocket({ pollId, endpoint, onMessage, enabled = true }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef         = useRef<WebSocket | null>(null)
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retriesRef    = useRef(0)
  const onMessageRef  = useRef(onMessage)
  const enabledRef    = useRef(enabled)

  // Keep refs up to date so closures always call the latest callback
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const connect = useCallback(() => {
    if (!enabledRef.current || (!pollId && !endpoint)) return

    const url = getWsUrl(pollId, endpoint)
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      retriesRef.current = 0 // reset backoff on successful connection
      setIsConnected(true)
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
      setIsConnected(false)
      // 1000 = normal close (component unmount/server shutdown)
      if (event.code === 1000 || !enabledRef.current) return

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30_000)
      retriesRef.current++
      reconnectRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      setIsConnected(false)
      ws.close()
    }
  }, [pollId])

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false)
      return
    }

    connect()

    return () => {
      // Clean up on unmount
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close(1000, 'component unmounted')
      }
      setIsConnected(false)
    }
  }, [enabled, connect])

  return { isConnected }
}
