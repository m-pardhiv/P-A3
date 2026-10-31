import { motion, useReducedMotion } from 'framer-motion'
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  Palette,
  Pause,
  Play,
  Workflow,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { easeOut } from '~/lib/motion'
import { cn } from '~/lib/utils'

/** Decorative, static previews of what customers find inside the portal. Not real data. */

export const base =
  'flex h-full w-full flex-col justify-between overflow-hidden rounded-[1.1rem] p-3 text-left sm:rounded-[1.4rem] sm:p-4'

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold sm:px-2 sm:text-[10px]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SupportCard() {
  return (
    <div className={cn(base, 'bg-gradient-to-br from-[#FF8FA8] to-[#E2503A] text-white')}>
      <LifeBuoy className="size-5 sm:size-7" />
      <div>
        <p className="text-[11px] font-extrabold leading-tight sm:text-sm">Priority Support</p>
        <p className="mt-0.5 text-[9px] opacity-90 sm:text-[11px]">Monthly · Active</p>
      </div>
    </div>
  )
}

export function InvoiceCard() {
  return (
    <div className={cn(base, 'bg-white')}>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
          Invoice
        </p>
        <p className="tabular mt-0.5 text-[10px] font-bold sm:text-xs">INV-2026-1054</p>
      </div>
      <div className="space-y-1.5">
        <div className="h-1 rounded-full bg-secondary sm:h-1.5" />
        <div className="h-1 w-2/3 rounded-full bg-secondary sm:h-1.5" />
      </div>
      <div>
        <p className="tabular text-base font-extrabold tracking-tight sm:text-xl">₹3,382.60</p>
        <Pill className="mt-1 bg-success-soft text-success">
          <CheckCircle2 className="size-2.5 sm:size-3" /> Paid
        </Pill>
      </div>
    </div>
  )
}

export function StudioCard() {
  return (
    <div className={cn(base, 'bg-gradient-to-br from-[#EFB11D] to-[#E8651A] text-white')}>
      <Palette className="size-5 sm:size-7" />
      <div>
        <p className="text-[11px] font-extrabold leading-tight sm:text-sm">Studio · Team</p>
        <p className="mt-0.5 text-[9px] opacity-90 sm:text-[11px]">4 seats</p>
      </div>
    </div>
  )
}

export function AnalyticsCard() {
  return (
    <div
      className={cn(base, 'bg-gradient-to-br from-[#E2503A] via-[#CF3A44] to-[#B51F52] text-white')}
    >
      <div className="flex items-center justify-between">
        <span className="grid size-6 place-items-center rounded-lg bg-white/20 sm:size-8 sm:rounded-xl">
          <BarChart3 className="size-3.5 sm:size-[18px]" />
        </span>
        <Pill className="bg-white/20 text-white">Active</Pill>
      </div>
      <div>
        <p className="text-[11px] font-extrabold sm:text-sm">Brightloop Analytics</p>
        <p className="tabular mt-1 text-xl font-extrabold leading-none tracking-tight sm:text-3xl">
          ₹3,382<span className="text-xs font-bold opacity-80 sm:text-sm">/mo</span>
        </p>
      </div>
      <div>
        <div className="h-1 overflow-hidden rounded-full bg-white/25 sm:h-1.5">
          <div className="h-full w-[82%] rounded-full bg-white" />
        </div>
        <p className="mt-1.5 text-[8px] font-semibold opacity-90 sm:text-[10px]">
          Renews in 18 days
        </p>
      </div>
    </div>
  )
}

export function RenewalCard() {
  return (
    <div className={cn(base, 'bg-[#14110F] text-white')}>
      <CalendarClock className="size-5 text-[#FFA2B6] sm:size-6" />
      <div>
        <p className="tabular text-3xl font-extrabold leading-none tracking-tight sm:text-5xl">
          18
        </p>
        <p className="mt-1 text-[9px] font-semibold text-white/70 sm:text-[11px]">
          days to renewal
        </p>
      </div>
    </div>
  )
}

export function PaymentCard() {
  return (
    <div className={cn(base, 'bg-white')}>
      <span className="grid size-6 place-items-center rounded-lg bg-secondary sm:size-8 sm:rounded-xl">
        <CreditCard className="size-3.5 sm:size-4" />
      </span>
      <div>
        <p className="text-[9px] text-muted-foreground sm:text-[11px]">UPI · Paid</p>
        <p className="tabular text-base font-extrabold tracking-tight sm:text-xl">₹1,000.00</p>
        <Pill className="mt-1 bg-success-soft text-success">Successful</Pill>
      </div>
    </div>
  )
}

export function WorkflowCard() {
  return (
    <div className={cn(base, 'bg-gradient-to-br from-[#FFA2B6] to-[#B51F52] text-white')}>
      <Workflow className="size-5 sm:size-7" />
      <div>
        <p className="text-[11px] font-extrabold leading-tight sm:text-sm">Workflows</p>
        <p className="mt-0.5 text-[9px] opacity-90 sm:text-[11px]">Business · Annual</p>
      </div>
    </div>
  )
}

export type MarqueeCard = { key: string; node: React.ReactNode }

const cards: MarqueeCard[] = [
  { key: 'analytics', node: <AnalyticsCard /> },
  { key: 'invoice', node: <InvoiceCard /> },
  { key: 'studio', node: <StudioCard /> },
  { key: 'renewal', node: <RenewalCard /> },
  { key: 'payment', node: <PaymentCard /> },
  { key: 'workflows', node: <WorkflowCard /> },
  { key: 'support', node: <SupportCard /> },
]

const mask = 'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)'
const SPEED = 46 // px per second

function cardWidthFor(stageWidth: number) {
  if (stageWidth < 640) return 136
  if (stageWidth < 1024) return 170
  return 200
}

/**
 * Endless slideshow whose cards travel along an arc: upright and raised in the middle, tilting and
 * dropping towards the edges. Each frame positions every card from its distance to the centre, so
 * cards rise onto the arc from the right, peak in the middle, and sink away to the left.
 * Pauses on hover and via the toggle; stays still (but arced) when reduced motion is requested.
 * Shows the decorative previews unless given `items`, such as a customer's own cards.
 */
export function CardMarquee({ items = cards }: { items?: MarqueeCard[] }) {
  const reduced = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const pausedRef = useRef(false)
  const [paused, setPaused] = useState(false)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cardW = cardWidthFor(width)
  const cardH = Math.round(cardW * 1.36)
  const spacing = cardW * 0.84
  // Enough cards that the wrap-around always happens off-screen.
  const count = width ? Math.max(items.length, Math.ceil((width + cardW * 2.5) / spacing)) : 0
  const total = count * spacing
  const drop = cardW * 0.5
  const stageHeight = cardH + drop + 56

  useEffect(() => {
    if (!width) return
    let offset = -total / 2 // puts card 0 dead centre
    let last = performance.now()
    let raf = 0

    const place = () => {
      const half = width / 2
      for (let i = 0; i < count; i++) {
        const el = itemRefs.current[i]
        if (!el) continue
        const dx = ((((i * spacing - offset) % total) + total) % total) - total / 2
        const t = Math.max(-1.25, Math.min(1.25, dx / half))
        const abs = Math.abs(t)
        const rotate = t * 15
        const y = t * t * drop
        const scale = 1.07 - 0.2 * Math.min(1, abs)
        el.style.transform = `translate3d(${dx}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`
        el.style.zIndex = String(Math.round(1000 - Math.abs(dx)))
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!pausedRef.current) offset += SPEED * dt
      place()
      raf = requestAnimationFrame(tick)
    }

    place()
    if (!reduced) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [width, count, spacing, total, drop, reduced])

  const setPause = (value: boolean) => {
    pausedRef.current = value
  }

  return (
    <div className="relative mx-auto w-full max-w-[96rem] pt-4 sm:pt-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: easeOut }}
        aria-hidden
        ref={stageRef}
        onPointerEnter={() => setPause(true)}
        onPointerLeave={() => setPause(paused)}
        className="relative overflow-hidden"
        style={{ height: stageHeight, maskImage: mask, WebkitMaskImage: mask }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            className="absolute top-6 will-change-transform"
            style={{ left: '50%', width: cardW, height: cardH, marginLeft: -cardW / 2 }}
          >
            <div className="size-full rounded-[1.1rem] shadow-[0_18px_40px_-16px_rgba(24,20,16,0.4)] ring-1 ring-black/5 transition-transform duration-300 hover:-translate-y-3 sm:rounded-[1.4rem]">
              {items[i % items.length].node}
            </div>
          </div>
        ))}
      </motion.div>

      {!reduced && (
        <button
          type="button"
          onClick={() => {
            setPaused((p) => {
              pausedRef.current = !p
              return !p
            })
          }}
          aria-pressed={paused}
          aria-label={paused ? 'Play card slideshow' : 'Pause card slideshow'}
          className="absolute bottom-1 right-3 z-[2000] grid size-8 place-items-center rounded-full border border-border/80 bg-white/80 text-foreground/70 backdrop-blur transition-colors hover:text-foreground sm:right-8"
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </button>
      )}
    </div>
  )
}
