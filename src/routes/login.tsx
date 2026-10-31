import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { AuthLayout } from '~/components/auth-layout'
import { FormError, FormField } from '~/components/form-field'
import { useZodForm } from '~/components/use-zod-form'
import { homeFor } from '~/lib/home-path'
import { login } from '~/server/functions/auth'
import { loginSchema } from '~/shared/schemas/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect(homeFor(context.user.role))
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = Route.useNavigate()
  const form = useZodForm({
    schema: loginSchema,
    submit: (input) => login({ data: input }),
    onSuccess: ({ role }) => navigate(homeFor(role)),
  })

  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to your Brightloop account. We’ll take you to the right place."
    >
      <form onSubmit={form.onSubmit} method="post" noValidate className="flex flex-col gap-4">
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
    </AuthLayout>
  )
}
