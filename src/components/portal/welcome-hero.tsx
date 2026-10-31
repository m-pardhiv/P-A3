import { motion } from 'framer-motion'
import { CalendarClock, ShieldCheck, TriangleAlert } from 'lucide-react'
import { greetingForNow } from '~/lib/format'
import { easeOut } from '~/lib/motion'
import { cn } from '~/lib/utils'

function FloatChip(props: {
  icon: typeof CalendarClock
  children: React.ReactNode
  className?: string
  tone?: 'brand' | 'warn' | 'good'
  delay?: number
}) {
  const { icon: Icon, children, className, tone = 'brand', delay = 0 } = props
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: easeOut }}
      className={cn('absolute', className)}
    >
      <div
        className="flex animate-float items-center gap-2.5 rounded-full border border-white/80 bg-white/90 py-2 pl-2 pr-4 text-[13px] font-semibold shadow-lift backdrop-blur"
        style={{ animationDelay: `${delay * 3}s` }}
      >
        <span
          className={cn(
            'grid size-7 place-items-center rounded-full',
            tone === 'brand' && 'bg-brand-gradient text-white',
            tone === 'warn' && 'bg-warning-soft text-warning',
            tone === 'good' && 'bg-success-soft text-success',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        {children}
      </div>
    </motion.div>
  )
}

const longDate = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})

/** The greeting at the top of a home page, with up to two floating notes. */
export function WelcomeHero(props: {
  today: string
  eyebrow?: string
  firstName: string
  message: string
  chip?: string
  attention?: { count: number; singular: string; plural: string; allGood: string }
}) {
  const { today, eyebrow, firstName, message, chip, attention } = props
  return (
    <section
      aria-labelledby="welcome-heading"
      className="mesh-hero relative overflow-hidden rounded-[1.75rem] border border-border/80 px-6 py-9 shadow-soft sm:px-10 sm:py-12"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 size-[26rem] rounded-full border border-brand-raspberry/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-44 size-[34rem] rounded-full border border-brand-raspberry/10"
      />

      <p className="text-[13px] font-semibold text-muted-foreground">
        {eyebrow ?? longDate.format(new Date(`${today}T00:00:00Z`))}
      </p>
      <h2
        id="welcome-heading"
        className="mt-2 max-w-xl text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-5xl"
      >
        <span suppressHydrationWarning>{greetingForNow()}</span>,{' '}
        <span className="text-gradient">{firstName}</span> <span aria-hidden>👋</span>
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{message}</p>

      {chip ? (
        <FloatChip icon={CalendarClock} className="right-8 top-8 hidden lg:block" delay={0.35}>
          {chip}
        </FloatChip>
      ) : null}
      {attention ? (
        <FloatChip
          icon={attention.count > 0 ? TriangleAlert : ShieldCheck}
          tone={attention.count > 0 ? 'warn' : 'good'}
          className="bottom-8 right-24 hidden xl:block"
          delay={0.55}
        >
          {attention.count > 0
            ? `${attention.count} ${attention.count === 1 ? attention.singular : attention.plural}`
            : attention.allGood}
        </FloatChip>
      ) : null}
    </section>
  )
}
