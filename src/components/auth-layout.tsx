import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { easeOut } from '~/lib/motion'
import { AnalyticsCard, InvoiceCard, PaymentCard } from './landing/hero-cards'
import { Logo } from './shell/logo'

/** The frame for sign in, sign up and password reset: the form on the left, a calm preview on the right. */
export function AuthLayout(props: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Brightloop home">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
          >
            <h1 className="text-4xl font-extrabold tracking-[-0.035em]">{props.title}</h1>
            {props.description ? (
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
                {props.description}
              </p>
            ) : null}
            <div className="mt-8">{props.children}</div>
          </motion.div>
        </div>
      </main>

      <aside
        aria-hidden
        className="mesh-hero relative hidden overflow-hidden border-l border-border/70 lg:block"
      >
        <div className="absolute -right-32 -top-32 size-[34rem] rounded-full border border-brand-raspberry/15" />
        <div className="relative flex h-full flex-col items-center justify-center px-12">
          <div className="relative h-[22rem] w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: -14 }}
              animate={{ opacity: 1, y: 0, rotate: -9 }}
              transition={{ duration: 0.7, delay: 0.2, ease: easeOut }}
              className="absolute left-0 top-10 h-52 w-40 rounded-[1.4rem] shadow-lift ring-1 ring-black/5"
            >
              <InvoiceCard />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: easeOut }}
              className="absolute left-1/2 top-0 z-10 h-72 w-52 -translate-x-1/2 rounded-[1.4rem] shadow-lift ring-1 ring-black/5"
            >
              <AnalyticsCard />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: 14 }}
              animate={{ opacity: 1, y: 0, rotate: 9 }}
              transition={{ duration: 0.7, delay: 0.4, ease: easeOut }}
              className="absolute right-0 top-14 h-52 w-40 rounded-[1.4rem] shadow-lift ring-1 ring-black/5"
            >
              <PaymentCard />
            </motion.div>
          </div>
          <h2 className="mt-8 max-w-sm text-center text-3xl font-extrabold leading-tight tracking-[-0.03em]">
            Everything you’ve bought, <span className="text-gradient">in one place.</span>
          </h2>
        </div>
      </aside>
    </div>
  )
}
