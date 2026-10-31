import { company } from '~/lib/company'

/** The closing line of the public home page and the customer portal. */
export function SiteFooter() {
  return (
    <footer id="contact" className="no-print mx-auto w-full max-w-[74rem] px-5 pb-10 sm:px-8">
      <div className="flex flex-col gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {company.name}
        </p>
        <p>
          Need help?{' '}
          <a
            href={`mailto:${company.supportEmail}`}
            className="font-semibold text-foreground hover:text-brand-ink"
          >
            {company.supportEmail}
          </a>
        </p>
      </div>
    </footer>
  )
}
