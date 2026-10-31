import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageHeader } from '~/components/page-header'
import { PlanForm } from '~/components/plan-form'

export const Route = createFileRoute('/_app/plans/new')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin') throw redirect({ to: '/plans', search: { page: 1 } })
  },
  component: () => (
    <div className="max-w-2xl">
      <PageHeader title="New plan" breadcrumbs={[{ label: 'Plans', to: '/plans' }]} />
      <PlanForm />
    </div>
  ),
})
