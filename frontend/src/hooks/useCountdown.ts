import { useState, useEffect, useRef } from 'react'

interface CountdownResult {
  formatted: string
  isExpired: boolean
  secondsRemaining: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

/**
 * useCountdown provides a tick-accurate countdown timer down to seconds.
 * Triggers `onExpire` callback once when the countdown hits 0.
 */
export function useCountdown(expiresAt?: string | null, onExpire?: () => void): CountdownResult | null {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!expiresAt) return -1
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    return diff > 0 ? diff : 0
  })

  const hasExpiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(-1)
      return
    }

    const calculate = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      if (diff <= 0) {
        setSecondsRemaining(0)
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true
          onExpireRef.current?.()
        }
      } else {
        setSecondsRemaining(diff)
      }
    }

    // Run once immediately
    calculate()

    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!expiresAt || secondsRemaining < 0) {
    return null
  }

  const isExpired = secondsRemaining <= 0
  const days = Math.floor(secondsRemaining / 86400)
  const hours = Math.floor((secondsRemaining % 86400) / 3600)
  const minutes = Math.floor((secondsRemaining % 3600) / 60)
  const seconds = secondsRemaining % 60

  let formatted = ''
  if (days > 0) {
    formatted = `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else if (hours > 0) {
    formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else {
    formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return {
    formatted,
    isExpired,
    secondsRemaining,
    days,
    hours,
    minutes,
    seconds,
  }
}
