import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

const TYPE_MS = 75
const DELETE_MS = 36
const HOLD_MS = 2400
const GAP_MS = 350

/**
 * Types each phrase out, holds it, backspaces it, then moves on to the next, forever.
 * Every phrase is also rendered invisibly in the same grid cell, so the heading is always as
 * tall as the tallest phrase (no layout shift at any screen width) and wrapping is stable.
 * Assistive tech reads one static headline; reduced-motion visitors see it without animation.
 */
export function Typewriter({ phrases }: { phrases: string[] }) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing')

  const text = phrases[index]

  useEffect(() => {
    if (reduced) return
    let delay: number
    let next: () => void

    if (phase === 'typing') {
      if (count < text.length) {
        delay = count === 0 && index === 0 ? 500 : TYPE_MS
        next = () => setCount((n) => n + 1)
      } else {
        delay = HOLD_MS
        next = () => setPhase('deleting')
      }
    } else if (count > 0) {
      delay = DELETE_MS
      next = () => setCount((n) => n - 1)
    } else {
      delay = GAP_MS
      next = () => {
        setIndex((i) => (i + 1) % phrases.length)
        setPhase('typing')
      }
    }

    const id = window.setTimeout(next, delay)
    return () => window.clearTimeout(id)
  }, [reduced, phase, count, index, text.length, phrases.length])

  return (
    <>
      <span className="sr-only" suppressHydrationWarning>
        {phrases[0]}
      </span>
      <span aria-hidden className="grid">
        {phrases.map((p) => (
          <span key={p} className="invisible col-start-1 row-start-1" suppressHydrationWarning>
            {p}
          </span>
        ))}
        <span className="col-start-1 row-start-1">
          {reduced ? phrases[0] : text.slice(0, count)}
          {!reduced && (
            <span className="relative inline-block w-0 align-baseline">
              <span className="absolute -bottom-[0.08em] left-[0.04em] h-[0.92em] w-[0.07em] animate-blink rounded-full bg-brand-raspberry" />
            </span>
          )}
          <span className="invisible" suppressHydrationWarning>
            {reduced ? '' : text.slice(count)}
          </span>
        </span>
      </span>
    </>
  )
}
