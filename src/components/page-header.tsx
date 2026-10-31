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
    <header className="mb-6 sm:mb-8">
      {props.breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-1.5">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground">
            {props.breadcrumbs.map((crumb) => (
              <li key={crumb.label} className="flex items-center gap-1">
                <Link to={crumb.to} className="transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
                <ChevronRight className="size-3 opacity-60" aria-hidden />
              </li>
            ))}
            <li aria-current="page" className="text-foreground/70">
              {props.title}
            </li>
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            {props.title}
          </h1>
          {props.description ? (
            <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {props.description}
            </p>
          ) : null}
        </div>
        {props.actions}
      </div>
    </header>
  )
}
