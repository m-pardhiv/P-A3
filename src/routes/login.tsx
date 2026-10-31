import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { useRef } from 'react'
import { AuthLayout } from '~/components/auth-layout'
import { FormError, FormField } from '~/components/form-field'
import { useZodForm } from '~/components/use-zod-form'
import { homeFor } from '~/lib/home-path'
import { getDemoLogins, login } from '~/server/functions/auth'
import { loginSchema } from '~/shared/schemas/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect(homeFor(context.user.role))
  },
  loader: () => getDemoLogins(),
  component: LoginPage,
})

function LoginPage() {
  const demo = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const form = useZodForm({
    schema: loginSchema,
    submit: (input) => login({ data: input }),
    onSuccess: ({ role }) => navigate(homeFor(role)),
  })

  /** Fills the form for the person, so a demonstration needs no typing. */
  function useAccount(email: string, password: string) {
    const fields = formRef.current?.elements
    if (!fields) return
    ;(fields.namedItem('email') as HTMLInputElement).value = email
    ;(fields.namedItem('password') as HTMLInputElement).value = password
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to your Brightloop account. We’ll take you to the right place."
    >
      <form
        ref={formRef}
        onSubmit={form.onSubmit}
        method="post"
        noValidate
        className="flex flex-col gap-4"
      >
        <FormError message={form.formError} />
        <FormField
          label="Email address"
          required
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          error={form.fieldErrors.email}
        />
        <FormField
          label="Password"
          required
          name="password"
          type="password"
          autoComplete="current-password"
          error={form.fieldErrors.password}
        />
        <button
          type="submit"
          className="btn btn-primary mt-1 min-h-12 w-full text-[15px]"
          disabled={form.pending}
        >
          {form.pending ? 'Logging in' : 'Log in'}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/forgot-password" className="link">
          Forgot password?
        </Link>
        <Link to="/signup" className="link">
          Create an account
        </Link>
      </div>

      {demo ? (
        <div className="mt-6 rounded-2xl border border-border/80 bg-muted/60 p-4">
          <p className="flex items-center gap-2 text-[13px] font-bold">
            <Info className="size-4 text-brand-ink" aria-hidden /> Demo accounts
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            This copy holds sample data. Every account uses the password{' '}
            <span className="font-semibold text-foreground">{demo.password}</span>.
          </p>
          <ul className="mt-3 space-y-2">
            {demo.accounts.map((account) => (
              <li
                key={account.email}
                className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold">{account.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {account.email}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => useAccount(account.email, demo.password)}
                  className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-colors hover:bg-brand-100"
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AuthLayout>
  )
}
