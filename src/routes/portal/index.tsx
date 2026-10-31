import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CardMarquee } from '~/components/landing/hero-cards'
import { Typewriter } from '~/components/landing/typewriter'
import { homeCards, type Overview } from '~/components/portal/home-cards'
import { LinkButton } from '~/components/ui/button'
import { formatDate, formatMoney, greetingForNow } from '~/lib/format'
import { rise } from '~/lib/motion'
import { getMyOverview } from '~/server/functions/portal'

const overviewQuery = queryOptions({
  queryKey: ['portal', 'overview'],
  queryFn: () => getMyOverview(),
})

export const Route = createFileRoute('/portal/')({
  loader: ({ context }) => context.queryClient.query(overviewQuery),
  component: HomePage,
})

/** Where the customer stands, in one plain sentence. */
function summary({ outstanding, overdueInvoices, current }: Overview) {
  if (overdueInvoices > 0) {
    const overdue = overdueInvoices === 1 ? '1 invoice is' : `${overdueInvoices} invoices are`
    return `You have ${formatMoney(outstanding)} to pay, and ${overdue} overdue.`
  }
  if (outstanding > 0) return `You have ${formatMoney(outstanding)} to pay.`
  if (current?.nextInvoiceDate) {
    return `You’re all paid up. Your next bill is on ${formatDate(current.nextInvoiceDate)}.`
  }
  return 'You have nothing to pay right now.'
}

/** The lines the headline types, in turn. The first is what screen readers hear. */
function headlines({ customerName, outstanding, current }: Overview) {
  const lines = [`${greetingForNow()}, ${customerName.split(' ')[0]}`]
  lines.push(outstanding > 0 ? `You have ${formatMoney(outstanding)} to pay` : 'You’re all paid up')
  if (current?.nextInvoiceDate) {
    lines.push(`Your next bill is on ${formatDate(current.nextInvoiceDate)}`)
  }
  return lines
}

function HomePage() {
  const { data } = useSuspenseQuery(overviewQuery)

  return (
    <>
      <section className="flex flex-col items-center px-5 pb-4 pt-12 text-center sm:px-8 sm:pt-16">
        <h1 className="w-full max-w-[60rem] text-balance text-[clamp(1.95rem,5.6vw,4.25rem)] font-extrabold leading-[1.08] tracking-[-0.04em]">
          <Typewriter phrases={headlines(data)} />
        </h1>

        <motion.p
          {...rise(0.6)}
          className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          {summary(data)}
        </motion.p>

        <motion.div
          {...rise(0.8)}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {data.current ? (
            <LinkButton
              to="/portal/subscriptions/$id"
              params={{ id: data.current.id }}
              size="lg"
              className="text-base"
            >
              View my subscription
            </LinkButton>
          ) : (
            <LinkButton to="/portal/plans" size="lg" className="text-base">
              Browse plans
            </LinkButton>
          )}
          <LinkButton
            to="/portal/invoices"
            search={{ page: 1 }}
            variant="secondary"
            size="lg"
            className="group text-base"
          >
            View invoices <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </LinkButton>
        </motion.div>
      </section>

      <div className="pb-6 pt-2">
        <CardMarquee items={homeCards(data)} />
      </div>
    </>
  )
}
