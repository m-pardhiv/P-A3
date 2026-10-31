import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { AuthLayout } from '~/components/auth-layout'
import { FormError, FormField } from '~/components/form-field'
import { useZodForm } from '~/components/use-zod-form'
import { resetPassword } from '~/server/functions/auth'
import { resetPasswordSchema } from '~/shared/schemas/auth'

export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({ token: z.string().catch('') }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const [done, setDone] = useState(false)
  const form = useZodForm({
    schema: resetPasswordSchema,
    submit: (input) => resetPassword({ data: input }),
    onSuccess: () => setDone(true),
  })

  if (done) {
    return (
      <AuthLayout title="Password changed">
        <p className="mb-6">You can now sign in with your new password.</p>
        <Link to="/login" className="btn btn-primary w-full">
          Sign in
        </Link>
      </AuthLayout>
    )
  }

  if (!token) {
    return (
      <AuthLayout title="This link is incomplete">
        <p className="mb-6">Open the link from your email, or request a new one.</p>
        <Link to="/forgot-password" className="btn btn-primary w-full">
          Request a new link
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={form.formError} />
        <input type="hidden" name="token" value={token} />
        <FormField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="More than 8 characters, with an uppercase letter, a lowercase letter and a special character."
          error={form.fieldErrors.password}
        />
        <FormField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={form.fieldErrors.confirmPassword}
        />
        <button type="submit" className="btn btn-primary" disabled={form.pending}>
          {form.pending ? 'Changing password' : 'Change password'}
        </button>
      </form>
    </AuthLayout>
  )
}
