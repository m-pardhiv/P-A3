import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { saveTemplate } from '~/server/functions/quotation-templates'
import { templateSchema } from '~/shared/schemas/subscriptions'
import { FormError, FormField, SelectField } from './form-field'
import { type LineDraft, LineEditor, type LineProduct, linesPayload } from './line-editor'
import { useToast } from './toast'
import { useZodForm } from './use-zod-form'

type Template = {
  id: string
  name: string
  planId: string
  paymentTermId: string
  validityDays: number
  lines: { id: string; productId: string; variantId: string | null; quantity: number }[]
}

type Options = {
  products: LineProduct[]
  plans: { id: string; name: string }[]
  paymentTerms: { id: string; name: string }[]
}

const toDrafts = (template?: Template): LineDraft[] =>
  template?.lines.map((line) => ({
    key: line.id,
    productId: line.productId,
    variantId: line.variantId ?? '',
    quantity: String(line.quantity),
  })) ?? []

export function TemplateForm({ template, options }: { template?: Template; options: Options }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [lines, setLines] = useState(() => toDrafts(template))

  const form = useZodForm({
    schema: templateSchema,
    values: () => ({ lines: linesPayload(lines) }),
    submit: (input) => saveTemplate({ data: input }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries()
      toast(template ? 'Template saved' : 'Template created')
      if (!template) navigate({ to: '/quotation-templates/$id', params: { id } })
    },
  })

  return (
    <form onSubmit={form.onSubmit} method="post" noValidate className="flex flex-col gap-6">
      <section className="panel flex flex-col gap-4">
        <FormError message={form.formError} />
        <input type="hidden" name="id" value={template?.id ?? ''} />
        <FormField
          label="Template name"
          required
          name="name"
          defaultValue={template?.name}
          error={form.fieldErrors.name}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Plan"
            required
            name="planId"
            defaultValue={template?.planId ?? ''}
            placeholder="Choose a plan"
            options={options.plans.map((plan) => ({ value: plan.id, label: plan.name }))}
            error={form.fieldErrors.planId}
          />
          <SelectField
            label="Payment terms"
            required
            name="paymentTermId"
            defaultValue={template?.paymentTermId ?? ''}
            placeholder="Choose payment terms"
            options={options.paymentTerms.map((term) => ({ value: term.id, label: term.name }))}
            error={form.fieldErrors.paymentTermId}
          />
          <FormField
            label="Quotation valid for (days)"
            required
            name="validityDays"
            inputMode="numeric"
            defaultValue={template?.validityDays ?? 30}
            error={form.fieldErrors.validityDays}
          />
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-1 text-xl font-semibold">Product lines</h2>
        <p className="mb-4 text-sm text-muted-foreground">Added on top of the plan's base fee.</p>
        <LineEditor
          lines={lines}
          products={options.products}
          errors={form.fieldErrors}
          onChange={setLines}
        />
      </section>

      <div>
        <button type="submit" className="btn btn-primary" disabled={form.pending}>
          {form.pending ? 'Saving' : template ? 'Save template' : 'Create template'}
        </button>
      </div>
    </form>
  )
}
