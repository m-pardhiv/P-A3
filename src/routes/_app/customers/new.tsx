import { createFileRoute } from '@tanstack/react-router'
import { CustomerForm } from '~/components/customer-form'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/_app/customers/new')({
  component: () => (
    <div className="max-w-2xl">
      <PageHeader title="New customer" breadcrumbs={[{ label: 'Customers', to: '/customers' }]} />
      <CustomerForm />
    </div>
  ),
})
