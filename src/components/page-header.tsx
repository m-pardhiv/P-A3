import { Link, type LinkProps } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export type Breadcrumb = { label: string; to: LinkProps['to'] }

export function PageHeader(props: {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  actions?: ReactNode
}) {
  return (
    <header className="mb-6">
      {props.breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
            {props.breadcrumbs.map((crumb) => (
              <li key={crumb.label} className="flex items-center gap-1">
                <Link to={crumb.to} className="hover:text-ink hover:underline">
                  {crumb.label}
                </Link>
                <ChevronRight size={14} aria-hidden />
              </li>
            ))}
            <li aria-current="page" className="text-text">
              {props.title}
            </li>
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-ink">{props.title}</h1>
          {props.description ? <p className="mt-1 text-muted">{props.description}</p> : null}
        </div>
        {props.actions}
      </div>
    </header>
  )
}
