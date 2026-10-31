import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { AuthLayout } from '~/components/auth-layout'
import { FormError, FormField } from '~/components/form-field'
import { useZodForm } from '~/components/use-zod-form'
import { homePathFor } from '~/lib/home-path'
import { signup } from '~/server/functions/auth'
import { signupSchema } from '~/shared/schemas/auth'

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: homePathFor(context.user.role) })
  },
  component: SignupPage,
})

function SignupPage() {
  const navigate = Route.useNavigate()
  const form = useZodForm({
    schema: signupSchema,
    submit: (input) => signup({ data: input }),
    onSuccess: ({ role }) => navigate({ to: homePathFor(role) }),
  })

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={form.formError} />
        <FormField
          label="Full name"
          name="name"
          autoComplete="name"
          error={form.fieldErrors.name}
        />
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
          autoComplete="new-password"
          hint="More than 8 characters, with an uppercase letter, a lowercase letter and a special character."
          error={form.fieldErrors.password}
        />
        <button type="submit" className="btn btn-primary" disabled={form.pending}>
          {form.pending ? 'Creating account' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-ink underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
