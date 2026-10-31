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
    <AuthLayout title="Sign in">
      <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={form.formError} />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={form.fieldErrors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          error={form.fieldErrors.password}
        />
        <button type="submit" className="btn btn-primary" disabled={form.pending}>
          {form.pending ? 'Signing in' : 'Sign in'}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/forgot-password" className="text-ink underline">
          Forgot password?
        </Link>
        <Link to="/signup" className="text-ink underline">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  )
}
