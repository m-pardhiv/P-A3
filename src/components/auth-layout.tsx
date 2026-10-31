import type { ReactNode } from 'react'
import { BrandMark } from './app-layout'

const TICKS = Array.from({ length: 12 }, (_, month) => month * 30)

/** Twelve billing periods around one closing loop. */
function BillingLoop() {
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-sm" aria-hidden>
      {TICKS.map((angle) => (
        <line
          key={angle}
          x1="100"
          y1="14"
          x2="100"
          y2="26"
          stroke="currentColor"
          strokeWidth="2"
          className="text-ink-line"
          transform={`rotate(${angle} 100 100)`}
        />
      ))}
      <circle
        className="loop-arc text-marigold"
        cx="100"
        cy="100"
        r="66"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        pathLength="100"
        transform="rotate(-90 100 100)"
      />
    </svg>
  )
}

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="flex flex-col justify-between bg-ink p-6 lg:p-12">
        <BrandMark />
        <div className="hidden lg:block">
          <BillingLoop />
          <p className="mt-10 max-w-md font-display text-3xl leading-tight font-medium text-white">
            Plans, quotations, invoices and payments, from first quote to every renewal.
          </p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-3xl font-semibold text-ink">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  )
}
