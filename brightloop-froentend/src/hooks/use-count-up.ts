import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

/** Animates from 0 to `target` once on mount (and again when the target changes). Skips animation for reduced motion. */
export function useCountUp(target: number, { duration = 1, delay = 0 } = {}) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)

  useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    const controls = animate(0, target, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setValue,
    })
    return () => controls.stop()
  }, [target, duration, delay, reduced])

  return value
}
