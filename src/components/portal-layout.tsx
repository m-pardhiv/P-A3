import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { SessionUser } from '~/server/session'
import { BrandMark, useSignOut } from './app-layout'

export function PortalLayout({ user, children }: { user: SessionUser; children: ReactNode }) {
  const signOut = useSignOut()

  return (
    <div className="min-h-dvh">
      <header className="bg-ink">
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-8">
          <div className="flex items-center justify-between gap-4 pb-3">
            <BrandMark />
            <div className="flex min-w-0 items-center gap-3 text-sm">
              <span className="truncate text-ink-text max-sm:hidden">{user.name}</span>
              <button type="button" className="text-ink-text underline" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
          <nav aria-label="Portal" className="flex gap-1 overflow-x-auto">
            <Link to="/portal/subscriptions" search={{ page: 1 }} className="portal-tab">
              My Subscriptions
            </Link>
            <Link to="/portal/invoices" search={{ page: 1 }} className="portal-tab">
              My Invoices
            </Link>
            <Link to="/portal/plans" className="portal-tab">
              Plans
            </Link>
            <Link to="/portal/profile" className="portal-tab">
              Profile
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  )
}
