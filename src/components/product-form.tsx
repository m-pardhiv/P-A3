import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { paiseToInput } from '~/lib/format'
import { useCurrentUser } from '~/lib/use-current-user'
import { saveProduct } from '~/server/functions/products'
import { PRODUCT_TYPES, productSchema } from '~/shared/schemas/catalogue'
import { CheckboxField, FormError, FormField, SelectField, TextAreaField } from './form-field'
import { useToast } from './toast'
import { useZodForm } from './use-zod-form'

type Product = {
  id: string
  name: string
  type: string
  salesPrice: number
  costPrice: number
  notes: string | null
  active: boolean
}

export function ProductForm({ product }: { product?: Product }) {
  const user = useCurrentUser()
  const canEdit = user.role === 'admin'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const form = useZodForm({
    schema: productSchema,
    submit: (input) => saveProduct({ data: input }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries()
      toast(product ? 'Product saved' : 'Product created')
      if (!product) navigate({ to: '/products/$id', params: { id } })
    },
  })

  return (
    <form onSubmit={form.onSubmit} method="post" noValidate className="panel">
      <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-4">
        <FormError message={form.formError} />
        <input type="hidden" name="id" value={product?.id ?? ''} />
        <FormField
          label="Name"
          required
          name="name"
          defaultValue={product?.name}
          error={form.fieldErrors.name}
        />
        <SelectField
          label="Type"
          required
          name="type"
          defaultValue={product?.type ?? ''}
          placeholder="Choose a type"
          options={PRODUCT_TYPES.map((type) => ({ value: type, label: type }))}
          error={form.fieldErrors.type}
          className="capitalize"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Sales price (₹)"
            required
            name="salesPrice"
            inputMode="decimal"
            defaultValue={product ? paiseToInput(product.salesPrice) : ''}
            error={form.fieldErrors.salesPrice}
          />
          <FormField
            label="Cost price (₹)"
            required
            name="costPrice"
            inputMode="decimal"
            defaultValue={product ? paiseToInput(product.costPrice) : ''}
            error={form.fieldErrors.costPrice}
          />
        </div>
        <TextAreaField
          label="Notes"
          name="notes"
          defaultValue={product?.notes ?? ''}
          error={form.fieldErrors.notes}
        />
        <CheckboxField label="Active" name="active" defaultChecked={product?.active ?? true} />
        {canEdit ? (
          <div>
            <button type="submit" className="btn btn-primary" disabled={form.pending}>
              {form.pending ? 'Saving' : product ? 'Save product' : 'Create product'}
            </button>
          </div>
        ) : null}
      </fieldset>
    </form>
  )
}
