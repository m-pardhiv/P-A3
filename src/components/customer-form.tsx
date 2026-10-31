import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { saveCustomer } from '~/server/functions/customers'
import { customerSchema } from '~/shared/schemas/catalogue'
import { FormError, FormField, TextAreaField } from './form-field'
import { useToast } from './toast'
import { useZodForm } from './use-zod-form'

type Customer = {
  id: string
  name: string
  company: string | null
  email: string
  phone: string | null
  address: string | null
}

export function CustomerForm({ customer }: { customer?: Customer }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const form = useZodForm({
    schema: customerSchema,
    submit: (input) => saveCustomer({ data: input }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries()
      toast(customer ? 'Customer saved' : 'Customer created')
      if (!customer) navigate({ to: '/customers/$id', params: { id } })
    },
  })

  return (
    <form onSubmit={form.onSubmit} method="post" noValidate className="panel flex flex-col gap-4">
      <FormError message={form.formError} />
      <input type="hidden" name="id" value={customer?.id ?? ''} />
      <FormField
        label="Name"
        required
        name="name"
        defaultValue={customer?.name}
        error={form.fieldErrors.name}
      />
      <FormField
        label="Company"
        name="company"
        defaultValue={customer?.company ?? ''}
        error={form.fieldErrors.company}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Email"
          required
          name="email"
          type="email"
          defaultValue={customer?.email}
          error={form.fieldErrors.email}
        />
        <FormField
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={customer?.phone ?? ''}
          error={form.fieldErrors.phone}
        />
      </div>
      <TextAreaField
        label="Address"
        name="address"
        defaultValue={customer?.address ?? ''}
        error={form.fieldErrors.address}
      />
      <div>
        <button type="submit" className="btn btn-primary" disabled={form.pending}>
          {form.pending ? 'Saving' : customer ? 'Save customer' : 'Create customer'}
        </button>
      </div>
    </form>
  )
}
