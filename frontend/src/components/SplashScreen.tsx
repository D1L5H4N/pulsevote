import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import './SplashScreen.css'

// ==========================================
// EXACT GEOMETRY CONSTANTS (Do not change)
// ==========================================
export const CENTER_X = 230
export const CENTER_Y = 230
export const RADIUS = 150
export const TOTAL_POINTS = 12
export const SKIP_INDEX = 5 // Gap for the tail
export const DIM_INDICES = [9, 10, 11] // Upper-left arc dim dots
export const DOT_RADIUS = 18
export const TAIL_STROKE_WIDTH = 24
export const TAIL_START_FACTOR = 0.62
export const TAIL_END_FACTOR = 2.0

// ==========================================
// COLOR CONSTANTS
// ==========================================
export const BG_COLOR = '#0A0A14'
export const DIM_COLOR = '#31304a'
export const DOT_GRAD_START = '#9083F7'
export const DOT_GRAD_END = '#4A3DE0'
export const TAIL_GRAD_START = '#8B7CF6'
export const TAIL_GRAD_END = '#3730D6'
export const TAG_COLOR = '#c7c5e8'

// ==========================================
// CONTENT CONSTANTS
// ==========================================
export const NAME = 'Quorum'
export const TAGWORDS = ['Polls.', 'Live.', 'Together.']

// ==========================================
// TIMING CONSTANTS (seconds)
// ==========================================
export const DOT_INITIAL_DELAY = 0.1
export const DOT_STAGGER = 0.075
export const DOT_ANIM_DURATION = 0.32
export const TAIL_DELAY_OFFSET = 0.1
export const TAIL_ANIM_DURATION = 0.3
export const SETTLE_DELAY_OFFSET = 0.32
export const SETTLE_ANIM_DURATION = 0.4
export const NAME_DELAY_OFFSET = 0.55
export const LETTER_STAGGER = 0.055
export const LETTER_ANIM_DURATION = 0.5
export const TAG_DELAY_OFFSET = 0.25
export const TAG_STAGGER = 0.18
export const TAG_ANIM_DURATION = 0.6
export const TOTAL_RUN_TIME = 3.2
export const REDUCED_MOTION_WAIT = 0.8
export const SESSION_STORAGE_KEY = 'quorum_splash_seen'

interface SplashScreenProps {
  onComplete?: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isSettled, setIsSettled] = useState(false)
  const hasCompletedRef = useRef(false)

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // 1. Exact geometry calculations from reference
  const { points, order, tailStart, tailEnd, tailDelay, settleDelay, nameStart, tagStart } = useMemo(() => {
    // 12 points evenly spaced on a true circle, starting at 12 o'clock, clockwise
    const pts = []
    for (let i = 0; i < TOTAL_POINTS; i++) {
      const angle = (i / TOTAL_POINTS) * 2 * Math.PI - Math.PI / 2
      pts.push({
        x: CENTER_X + RADIUS * Math.cos(angle),
        y: CENTER_Y + RADIUS * Math.sin(angle),
      })
    }

    // Draw order: starts right after the tail gap and goes clockwise all the way around
    const ord: number[] = []
    for (let k = 1; k < TOTAL_POINTS; k++) {
      ord.push((SKIP_INDEX + k) % TOTAL_POINTS)
    }

    // Tail: line along the angle of the empty slot
    const tAngle = (SKIP_INDEX / TOTAL_POINTS) * 2 * Math.PI - Math.PI / 2
    const start = {
      x: CENTER_X + RADIUS * TAIL_START_FACTOR * Math.cos(tAngle),
      y: CENTER_Y + RADIUS * TAIL_START_FACTOR * Math.sin(tAngle),
    }
    const end = {
      x: CENTER_X + RADIUS * TAIL_END_FACTOR * Math.cos(tAngle),
      y: CENTER_Y + RADIUS * TAIL_END_FACTOR * Math.sin(tAngle),
    }

    // Sequence timings
    const tDelay = DOT_INITIAL_DELAY + ord.length * DOT_STAGGER + TAIL_DELAY_OFFSET
    const sDelay = tDelay + SETTLE_DELAY_OFFSET
    const nStart = tDelay + NAME_DELAY_OFFSET
    const tgStart = nStart + NAME.length * LETTER_STAGGER + TAG_DELAY_OFFSET

    return {
      points: pts,
      order: ord,
      tailStart: start,
      tailEnd: end,
      tailDelay: tDelay,
      settleDelay: sDelay,
      nameStart: nStart,
      tagStart: tgStart,
    }
  }, [])

  // Complete and trigger transition
  const handleFinish = useCallback(() => {
    if (hasCompletedRef.current) return
    hasCompletedRef.current = true

    // Mark as seen in sessionStorage
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
    } catch {
      // Ignore sessionStorage restrictions if private mode
    }

    setIsFadingOut(true)
    setTimeout(() => {
      onComplete?.()
    }, 350)
  }, [onComplete])

  // Sequence timer & Settle effect
  useEffect(() => {
    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        handleFinish()
      }, REDUCED_MOTION_WAIT * 1000)
      return () => clearTimeout(timer)
    }

    // Settle pulse timer
    const settleTimer = setTimeout(() => {
      setIsSettled(true)
    }, settleDelay * 1000)

    // Complete timer
    const completeTimer = setTimeout(() => {
      handleFinish()
    }, TOTAL_RUN_TIME * 1000)

    return () => {
      clearTimeout(settleTimer)
      clearTimeout(completeTimer)
    }
  }, [prefersReducedMotion, settleDelay, handleFinish])

  return (
    <div
      className={`splash-overlay ${isFadingOut ? 'fade-out' : ''} ${
        prefersReducedMotion ? 'splash-reduced-motion' : ''
      }`}
      onClick={handleFinish}
      role="button"
      tabIndex={0}
      aria-label="Skip splash intro"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleFinish()
      }}
    >
      <div className="splash-stage">
        <svg
          width="380"
          height="380"
          viewBox="0 0 460 460"
          className="splash-svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="dotgrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={DOT_GRAD_START} />
              <stop offset="100%" stopColor={DOT_GRAD_END} />
            </linearGradient>
            <linearGradient id="tailgrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={TAIL_GRAD_START} />
              <stop offset="100%" stopColor={TAIL_GRAD_END} />
            </linearGradient>
          </defs>

          <g className={`splash-ringgroup ${isSettled ? 'settle' : ''}`}>
            {/* 11 Dots popping in clockwise order starting after gap */}
            {order.map((pointIndex, seq) => {
              const pt = points[pointIndex]
              const isDim = DIM_INDICES.includes(pointIndex)
              const delay = prefersReducedMotion ? '0s' : `${DOT_INITIAL_DELAY + seq * DOT_STAGGER}s`

              return (
                <circle
                  key={pointIndex}
                  cx={pt.x}
                  cy={pt.y}
                  r={DOT_RADIUS}
                  fill={isDim ? DIM_COLOR : 'url(#dotgrad)'}
                  className="splash-dot"
                  style={{ animationDelay: delay }}
                />
              )
            })}

            {/* Tail drawing in through the gap */}
            <line
              x1={tailStart.x}
              y1={tailStart.y}
              x2={tailEnd.x}
              y2={tailEnd.y}
              stroke="url(#tailgrad)"
              strokeWidth={TAIL_STROKE_WIDTH}
              strokeLinecap="round"
              className="splash-tail"
              style={{
                animationDelay: prefersReducedMotion ? '0s' : `${tailDelay}s`,
              }}
            />
          </g>
        </svg>

        {/* Wordmark: "Quorum" letter-by-letter */}
        <div className="splash-word">
          {Array.from(NAME).map((char, i) => (
            <span
              key={i}
              className="splash-letter"
              style={{
                animationDelay: prefersReducedMotion ? '0s' : `${nameStart + i * LETTER_STAGGER}s`,
              }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Tagline: "Polls. Live. Together." word-by-word */}
        <div className="splash-tagline">
          {TAGWORDS.map((word, i) => (
            <span
              key={i}
              className="splash-tagword"
              style={{
                animationDelay: prefersReducedMotion ? '0s' : `${tagStart + i * TAG_STAGGER}s`,
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Skip indicator */}
      <div className="splash-skip">Click anywhere to skip</div>
    </div>
  )
}
