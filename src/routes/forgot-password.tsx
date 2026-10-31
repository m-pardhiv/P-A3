import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthLayout } from '~/components/auth-layout'
import { FormError, FormField } from '~/components/form-field'
import { useZodForm } from '~/components/use-zod-form'
import { forgotPassword } from '~/server/functions/auth'
import { forgotPasswordSchema } from '~/shared/schemas/auth'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const form = useZodForm({
    schema: forgotPasswordSchema,
    submit: (input) => forgotPassword({ data: input }),
    onSuccess: () => setSent(true),
  })

  return (
    <AuthLayout title="Reset your password">
      {sent ? (
        <p role="status">
          If that email has an account, a reset link is on its way. The link expires in 1 hour.
        </p>
      ) : (
        <form onSubmit={form.onSubmit} method="post" noValidate className="flex flex-col gap-4">
          <FormError message={form.formError} />
          <FormField
            label="Email"
            required
            name="email"
            type="email"
            autoComplete="email"
            error={form.fieldErrors.email}
          />
          <button
            type="submit"
            className="btn btn-primary mt-1 min-h-12 w-full text-[15px]"
            disabled={form.pending}
          >
            {form.pending ? 'Sending link' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link to="/login" className="link">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
