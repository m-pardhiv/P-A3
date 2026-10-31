import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { ProductForm } from '~/components/product-form'

export const Route = createFileRoute('/_app/products/new')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin') throw redirect({ to: '/products', search: { page: 1 } })
  },
  component: () => (
    <div className="max-w-2xl">
      <PageHeader title="New product" breadcrumbs={[{ label: 'Products', to: '/products' }]} />
      <ProductForm />
    </div>
  ),
})
