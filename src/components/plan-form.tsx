import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { capitalize, paiseToInput } from '~/lib/format'
import { useCurrentUser } from '~/lib/use-current-user'
import { savePlan } from '~/server/functions/plans'
import { BILLING_PERIODS, planSchema } from '~/shared/schemas/catalogue'
import { CheckboxField, FormError, FormField, SelectField } from './form-field'
import { useToast } from './toast'
import { useZodForm } from './use-zod-form'

type Plan = {
  id: string
  name: string
  price: number
  billingPeriod: string
  minQuantity: number
  availableFrom: string | null
  availableTo: string | null
  autoClose: boolean
  closable: boolean
  pausable: boolean
  renewable: boolean
  active: boolean
}

export function PlanForm({ plan }: { plan?: Plan }) {
  const user = useCurrentUser()
  const canEdit = user.role === 'admin'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const form = useZodForm({
    schema: planSchema,
    submit: (input) => savePlan({ data: input }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries()
      toast(plan ? 'Plan saved' : 'Plan created')
      if (!plan) navigate({ to: '/plans/$id', params: { id } })
    },
  })

  return (
    <form onSubmit={form.onSubmit} method="post" noValidate className="panel">
      <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-4">
        <FormError message={form.formError} />
        <input type="hidden" name="id" value={plan?.id ?? ''} />
        <FormField
          label="Name"
          required
          name="name"
          defaultValue={plan?.name}
          error={form.fieldErrors.name}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            label="Price (₹)"
            required
            name="price"
            inputMode="decimal"
            defaultValue={plan ? paiseToInput(plan.price) : ''}
            error={form.fieldErrors.price}
          />
          <SelectField
            label="Billing period"
            required
            name="billingPeriod"
            defaultValue={plan?.billingPeriod ?? 'monthly'}
            options={BILLING_PERIODS.map((value) => ({ value, label: capitalize(value) }))}
            error={form.fieldErrors.billingPeriod}
          />
          <FormField
            label="Minimum quantity"
            required
            name="minQuantity"
            inputMode="numeric"
            defaultValue={plan?.minQuantity ?? 1}
            error={form.fieldErrors.minQuantity}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Available from"
            name="availableFrom"
            type="date"
            defaultValue={plan?.availableFrom ?? ''}
            error={form.fieldErrors.availableFrom}
          />
          <FormField
            label="Available to"
            name="availableTo"
            type="date"
            defaultValue={plan?.availableTo ?? ''}
            error={form.fieldErrors.availableTo}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField
            label="Closes automatically at expiry"
            name="autoClose"
            defaultChecked={plan?.autoClose}
          />
          <CheckboxField
            label="Can be closed early"
            name="closable"
            defaultChecked={plan?.closable ?? true}
          />
          <CheckboxField label="Can be paused" name="pausable" defaultChecked={plan?.pausable} />
          <CheckboxField
            label="Can be renewed"
            name="renewable"
            defaultChecked={plan?.renewable ?? true}
          />
          <CheckboxField label="Active" name="active" defaultChecked={plan?.active ?? true} />
        </div>
        {canEdit ? (
          <div>
            <button type="submit" className="btn btn-primary" disabled={form.pending}>
              {form.pending ? 'Saving' : plan ? 'Save plan' : 'Create plan'}
            </button>
          </div>
        ) : null}
      </fieldset>
    </form>
  )
}
