import { motion } from 'framer-motion'
import { ArrowUpRight, CreditCard, FileText, Layers, UserRound, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { staggerItem } from '@/lib/motion'

export function QuickActions({ subscriptionPath }: { subscriptionPath: string }) {
  const actions: { to: string; label: string; icon: LucideIcon }[] = [
    { to: subscriptionPath, label: 'View subscription', icon: Layers },
    { to: '/invoices', label: 'View invoices', icon: FileText },
    { to: '/payments', label: 'Payment history', icon: CreditCard },
    { to: '/account', label: 'Manage account', icon: UserRound },
  ]
  return (
    <motion.section variants={staggerItem} aria-label="Quick actions">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Quick actions</h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map(({ to, label, icon: Icon }) => (
          <li key={label}>
            <Link
              to={to}
              className="group flex min-h-14 items-center gap-3 rounded-2xl py-2 border border-border/80 bg-card px-3.5 text-sm font-semibold shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-raspberry/40 hover:shadow-lift"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-brand-ink transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 leading-tight">{label}</span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </motion.section>
  )
}
