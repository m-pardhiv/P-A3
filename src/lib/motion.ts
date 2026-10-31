import type { Variants } from 'framer-motion'

export const easeOut = [0.22, 1, 0.36, 1] as const

/** Staggered entrance for grids of cards. Use on the parent; children use `staggerItem`. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
}

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: easeOut },
}
