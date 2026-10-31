import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { FormError, FormField } from '~/components/form-field'
import { PageHeader } from '~/components/page-header'
import { ProductForm } from '~/components/product-form'
import { useToast } from '~/components/toast'
import { useZodForm } from '~/components/use-zod-form'
import { formatMoney } from '~/lib/format'
import { useCurrentUser } from '~/lib/use-current-user'
import { addVariant, deleteVariant, getProduct } from '~/server/functions/products'
import { variantSchema } from '~/shared/schemas/catalogue'

const productQuery = (id: string) =>
  queryOptions({
    queryKey: ['product', id],
    queryFn: () => getProduct({ data: { id } }),
  })

export const Route = createFileRoute('/_app/products/$id')({
  loader: ({ context, params }) => context.queryClient.query(productQuery(params.id)),
  component: ProductPage,
})

function ProductPage() {
  const { id } = Route.useParams()
  const user = useCurrentUser()
  const canEdit = user.role === 'admin'
  const { data } = useSuspenseQuery(productQuery(id))
  const queryClient = useQueryClient()
  const toast = useToast()
  const [removing, setRemoving] = useState<{ id: string; label: string }>()

  const form = useZodForm({
    schema: variantSchema,
    submit: (input) => addVariant({ data: input }),
    onSuccess: (_, element) => {
      element.reset()
      queryClient.invalidateQueries()
      toast('Variant added')
    },
  })

  const remove = useMutation({
    mutationFn: (variantId: string) => deleteVariant({ data: { id: variantId } }),
    onSuccess: (result) => {
      setRemoving(undefined)
      if (result.ok) {
        queryClient.invalidateQueries()
        toast('Variant removed')
      } else {
        toast(result.error ?? 'That variant could not be removed', 'danger')
      }
    },
  })

  return (
    <>
      <PageHeader
        title={data.product.name}
        breadcrumbs={[{ label: 'Products', to: '/products' }]}
        description={canEdit ? undefined : 'Only an admin can change products.'}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ProductForm key={data.product.id} product={data.product} />

        <section className="panel">
          <h2 className="mb-1 text-xl font-semibold">Variants</h2>
          <p className="mb-4 text-sm text-muted">
            A line's unit price is the sales price plus the variant's extra price.
          </p>
          {data.variants.length ? (
            <ul className="mb-4 flex flex-col">
              {data.variants.map((variant) => (
                <li
                  key={variant.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0"
                >
                  <span className="min-w-0">
                    {variant.attribute}: {variant.value}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular">+{formatMoney(variant.extraPrice)}</span>
                    {canEdit ? (
                      <button
                        type="button"
                        aria-label={`Remove ${variant.value}`}
                        className="btn btn-secondary px-3"
                        onClick={() =>
                          setRemoving({
                            id: variant.id,
                            label: `${variant.attribute}: ${variant.value}`,
                          })
                        }
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-muted">This product has no variants yet.</p>
          )}

          {canEdit ? (
            <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
              <FormError message={form.formError} />
              <input type="hidden" name="productId" value={data.product.id} />
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  label="Attribute"
                  name="attribute"
                  placeholder="Brand"
                  error={form.fieldErrors.attribute}
                />
                <FormField
                  label="Value"
                  name="value"
                  placeholder="Odoo"
                  error={form.fieldErrors.value}
                />
                <FormField
                  label="Extra price (₹)"
                  name="extraPrice"
                  inputMode="decimal"
                  placeholder="560.00"
                  error={form.fieldErrors.extraPrice}
                />
              </div>
              <div>
                <button type="submit" className="btn btn-secondary" disabled={form.pending}>
                  {form.pending ? 'Adding variant' : 'Add variant'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>

      <ConfirmDialog
        open={removing !== undefined}
        title="Remove this variant?"
        message={`${removing?.label ?? 'This variant'} will no longer be available on new lines.`}
        confirmLabel="Remove variant"
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  )
}
