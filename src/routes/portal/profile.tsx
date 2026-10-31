import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { FormError, FormField, TextAreaField } from '~/components/form-field'
import { PageHeader } from '~/components/page-header'
import { useToast } from '~/components/toast'
import { useZodForm } from '~/components/use-zod-form'
import { getMyProfile, updateMyProfile } from '~/server/functions/portal'
import { profileSchema } from '~/shared/schemas/portal'

const profileQuery = queryOptions({
  queryKey: ['portal', 'profile'],
  queryFn: () => getMyProfile(),
})

export const Route = createFileRoute('/portal/profile')({
  loader: ({ context }) => context.queryClient.query(profileQuery),
  component: ProfilePage,
})

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQuery)
  const queryClient = useQueryClient()
  const toast = useToast()

  const form = useZodForm({
    schema: profileSchema,
    submit: (input) => updateMyProfile({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      toast('Profile saved')
    },
  })

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Account" description="The details Brightloop uses on your invoices." />
      <form onSubmit={form.onSubmit} method="post" noValidate className="panel flex flex-col gap-4">
        <FormError message={form.formError} />
        <FormField
          label="Name"
          required
          name="name"
          defaultValue={profile.name}
          error={form.fieldErrors.name}
        />
        <FormField
          label="Company"
          name="company"
          defaultValue={profile.company ?? ''}
          error={form.fieldErrors.company}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          value={profile.email}
          readOnly
          hint="This is your sign-in email. Contact Brightloop to change it."
        />
        <FormField
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ''}
          error={form.fieldErrors.phone}
        />
        <TextAreaField
          label="Address"
          name="address"
          defaultValue={profile.address ?? ''}
          error={form.fieldErrors.address}
        />
        <div>
          <button type="submit" className="btn btn-primary" disabled={form.pending}>
            {form.pending ? 'Saving' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
