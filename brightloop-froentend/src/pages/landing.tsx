import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ArrowRight, FileText, Layers, ShieldCheck, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/layout/logo'
import { LinkButton } from '@/components/ui/button'
import { company } from '@/config/company'
import { homeFor } from '@/config/navigation'
import { usePortal } from '@/context/portal'
import { CardMarquee } from '@/features/landing/hero-cards'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { easeOut } from '@/lib/motion'

const features = [
  {
    icon: Layers,
    title: 'Your subscriptions',
    body: 'See every plan you have, when it renews, and pause, renew or cancel when your plan allows it.',
  },
  {
    icon: FileText,
    title: 'Invoices, any time',
    body: 'Search your invoices, check the tax and discount breakdown, and download a PDF in one click.',
  },
  {
    icon: Wallet,
    title: 'Payments at a glance',
    body: 'Track every payment and what’s still outstanding, without having to contact anyone.',
  },
]

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: easeOut },
})

/** Headlines that take turns. Keep each short enough to sit on three lines on a phone. */
const HEADLINES = [
  'Where customers and teams manage subscriptions with ease',
  'Every invoice, payment and renewal in one place',
  'Pause, renew or cancel without waiting on anyone',
  'One login for customers, staff and admins',
]

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
function Typewriter({ phrases }: { phrases: string[] }) {
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
      <span className="sr-only">{phrases[0]}</span>
      <span aria-hidden className="grid">
        {phrases.map((p) => (
          <span key={p} className="invisible col-start-1 row-start-1">
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
          <span className="invisible">{reduced ? '' : text.slice(count)}</span>
        </span>
      </span>
    </>
  )
}

export default function LandingPage() {
  useDocumentTitle('Billing & Subscriptions')
  const { session } = usePortal()

  return (
    <div className="min-h-screen bg-white">
      <header className="relative z-20 mx-auto flex h-[4.5rem] max-w-[74rem] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Brightloop home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[15px] font-semibold text-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-brand-ink">
              Features
            </a>
            <a href="#security" className="transition-colors hover:text-brand-ink">
              Security
            </a>
            <a href="#contact" className="transition-colors hover:text-brand-ink">
              Contact
            </a>
          </nav>
        </div>
        {session ? (
          <LinkButton to={homeFor(session.role)} variant="ghost" className="text-[15px]">
            Open portal
          </LinkButton>
        ) : (
          <LinkButton to="/login" variant="ghost" className="text-[15px]">
            Log in
          </LinkButton>
        )}
      </header>

      <main>
        <section className="flex flex-col items-center px-5 pb-4 pt-12 text-center sm:px-8 sm:pt-16">
          <h1 className="w-full max-w-[60rem] text-balance text-[clamp(1.95rem,5.6vw,4.25rem)] font-extrabold leading-[1.08] tracking-[-0.04em]">
            <Typewriter phrases={HEADLINES} />
          </h1>

          <motion.p {...rise(0.6)} className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            The billing portal for customers, staff and admins.
            <br className="hidden sm:block" /> Subscriptions, invoices and payments, all in one place.
          </motion.p>

          <motion.div {...rise(0.8)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              href="#features"
              className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground transition-colors hover:bg-foreground/85"
            >
              Explore features
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              href="#contact"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-secondary px-7 text-base font-semibold text-foreground transition-colors hover:bg-secondary/70"
            >
              Contact us <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </motion.a>
          </motion.div>
        </section>

        <div className="pb-6 pt-2">
          <CardMarquee />
        </div>
      </main>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Everything you’ve bought, in one calm place</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Log in to see what you subscribe to, what you’ve paid and what’s coming up next.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: easeOut }}
              className="rounded-card border border-border/80 bg-card p-6 shadow-soft"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-brand-ink">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </div>

        <div
          id="security"
          className="mt-8 flex scroll-mt-8 flex-col items-start gap-4 rounded-card bg-foreground p-6 text-background sm:flex-row sm:items-center sm:p-8"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-brand-blush">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h3 className="text-lg font-bold">Private by role</h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-background/70">
              One login for everyone. Customers only ever see their own subscriptions, invoices and payments, while staff and admins are
              taken to their own consoles.
            </p>
          </div>
        </div>
      </section>

      <footer id="contact" className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
        <div className="flex flex-col gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {company.name}
          </p>
          <p>
            Need help?{' '}
            <a href={`mailto:${company.supportEmail}`} className="font-semibold text-foreground hover:text-brand-ink">
              {company.supportEmail}
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
