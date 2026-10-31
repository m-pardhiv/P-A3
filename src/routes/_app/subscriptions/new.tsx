import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { FormError, FormField, SelectField } from '~/components/form-field'
import { type LineDraft, LineEditor, linePrice, linesPayload } from '~/components/line-editor'
import { PageHeader } from '~/components/page-header'
import { useToast } from '~/components/toast'
import { Totals } from '~/components/totals'
import { useZodForm } from '~/components/use-zod-form'
import { capitalize, formatMoney } from '~/lib/format'
import { formOptionsQuery } from '~/lib/queries'
import { taxOn } from '~/server/domain/tax'
import type { getFormOptions } from '~/server/functions/options'
import { createSubscription } from '~/server/functions/subscriptions'
import { createSubscriptionSchema } from '~/shared/schemas/subscriptions'

export const Route = createFileRoute('/_app/subscriptions/new')({
  validateSearch: z.object({ templateId: z.uuid().optional().catch(undefined) }),
  loader: ({ context }) => context.queryClient.query(formOptionsQuery),
  component: NewSubscriptionPage,
})

type Template = Awaited<ReturnType<typeof getFormOptions>>['templates'][number]

const templateLines = (template?: Template): LineDraft[] =>
  template?.lines.map((line) => ({
    key: line.id,
    productId: line.productId,
    variantId: line.variantId ?? '',
    quantity: String(line.quantity),
  })) ?? []

function NewSubscriptionPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: options } = useSuspenseQuery(formOptionsQuery)
  const queryClient = useQueryClient()
  const toast = useToast()

  const initial = options.templates.find((template) => template.id === search.templateId)
  const minimumFor = (planId?: string) =>
    String(options.plans.find((plan) => plan.id === planId)?.minQuantity ?? 1)

  const [templateId, setTemplateId] = useState(initial?.id ?? '')
  const [planId, setPlanId] = useState(initial?.planId ?? '')
  const [termId, setTermId] = useState(initial?.paymentTermId ?? '')
  const [planQuantity, setPlanQuantity] = useState(minimumFor(initial?.planId))
  const [lines, setLines] = useState(() => templateLines(initial))

  function chooseTemplate(id: string) {
    const template = options.templates.find((t) => t.id === id)
    setTemplateId(id)
    if (!template) return
    setPlanId(template.planId)
    setTermId(template.paymentTermId)
    setPlanQuantity(minimumFor(template.planId))
    setLines(templateLines(template))
  }

  function choosePlan(id: string) {
    setPlanId(id)
    setPlanQuantity(minimumFor(id))
  }

  const form = useZodForm({
    schema: createSubscriptionSchema,
    values: () => ({ lines: linesPayload(lines) }),
    submit: (input) => createSubscription({ data: input }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries()
      toast('Subscription created')
      navigate({ to: '/subscriptions/$id', params: { id }, search: {} })
    },
  })

  const plan = options.plans.find((p) => p.id === planId)
  const planAmount = (plan?.price ?? 0) * (Number(planQuantity) || 0)
  const prices = lines.map((line) => linePrice(line, options.products))
  const subtotal = planAmount + prices.reduce((sum, price) => sum + price.amount, 0)
  const tax =
    taxOn(planAmount, options.planTaxRatePercent) +
    prices.reduce((sum, price) => sum + price.tax, 0)

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New subscription"
        breadcrumbs={[{ label: 'Subscriptions', to: '/subscriptions' }]}
      />
      <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-6">
        <section className="panel flex flex-col gap-4">
          <FormError message={form.formError} />
          <SelectField
            label="Quotation template"
            name="templateId"
            value={templateId}
            onChange={(event) => chooseTemplate(event.target.value)}
            placeholder="Start from scratch"
            options={options.templates.map((t) => ({ value: t.id, label: t.name }))}
            hint="A template fills in the plan, payment terms and lines, and sets how long the quotation stays valid."
          />
          <SelectField
            label="Customer"
            name="customerId"
            defaultValue=""
            placeholder="Choose a customer"
            options={options.customers.map((c) => ({
              value: c.id,
              label: c.company ? `${c.name} (${c.company})` : c.name,
            }))}
            error={form.fieldErrors.customerId}
          />
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <SelectField
              label="Plan"
              name="planId"
              value={planId}
              onChange={(event) => choosePlan(event.target.value)}
              placeholder="Choose a plan"
              options={options.plans.map((p) => ({
                value: p.id,
                label: `${p.name} (${formatMoney(p.price)} ${capitalize(p.billingPeriod).toLowerCase()})`,
              }))}
              error={form.fieldErrors.planId}
            />
            <FormField
              label="Plan quantity"
              name="planQuantity"
              inputMode="numeric"
              value={planQuantity}
              onChange={(event) => setPlanQuantity(event.target.value)}
              hint={plan ? `Minimum ${plan.minQuantity}` : undefined}
              error={form.fieldErrors.planQuantity}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Start date"
              name="startDate"
              type="date"
              defaultValue={options.today}
              error={form.fieldErrors.startDate}
            />
            <FormField
              label="Expiry date"
              name="expiryDate"
              type="date"
              hint="Leave empty for no end date."
              error={form.fieldErrors.expiryDate}
            />
            <SelectField
              label="Payment terms"
              name="paymentTermId"
              value={termId}
              onChange={(event) => setTermId(event.target.value)}
              placeholder="Choose payment terms"
              options={options.paymentTerms.map((term) => ({ value: term.id, label: term.name }))}
              error={form.fieldErrors.paymentTermId}
            />
          </div>
        </section>

        <section className="panel">
          <h2 className="mb-1 text-xl font-semibold">Product lines</h2>
          <p className="mb-4 text-sm text-muted">
            The plan's base fee is the first line. These are added on top.
          </p>
          <LineEditor
            lines={lines}
            products={options.products}
            errors={form.fieldErrors}
            onChange={setLines}
          />
          <Totals subtotal={subtotal} tax={tax} total={subtotal + tax} />
        </section>

        <div>
          <button type="submit" className="btn btn-primary" disabled={form.pending}>
            {form.pending ? 'Creating subscription' : 'Create subscription'}
          </button>
        </div>
      </form>
    </div>
  )
}
