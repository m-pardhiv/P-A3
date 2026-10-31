import { Info } from 'lucide-react'
import { api } from '@/api'
import { AsyncView } from '@/components/common/async-view'
import { TableSkeleton } from '@/components/common/skeletons'
import { ProductIcon } from '@/components/common/product-icon'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/context/toast'
import { useAsync } from '@/hooks/use-async'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cycleUnit, formatCurrency } from '@/lib/format'
import type { PlanConfig, ProductIconKey, SubscriptionPermissions } from '@/types'

const columns: { key: keyof SubscriptionPermissions; label: string; verb: string }[] = [
  { key: 'canPause', label: 'Pause', verb: 'pause' },
  { key: 'canResume', label: 'Resume', verb: 'resume' },
  { key: 'canRenew', label: 'Renew', verb: 'renew' },
  { key: 'canCancel', label: 'Cancel', verb: 'cancel' },
]

function PlansContent({ plans, onChange }: { plans: PlanConfig[]; onChange: (p: PlanConfig) => void }) {
  const toast = useToast()

  const toggle = async (plan: PlanConfig, key: keyof SubscriptionPermissions, verb: string, on: boolean) => {
    try {
      const updated = await api.updatePlanPermissions(plan.id, { [key]: on })
      onChange(updated)
      toast.success('Plan updated', `Customers on ${plan.productName} · ${plan.planName} ${on ? 'can now' : 'can no longer'} ${verb} online.`)
    } catch (e) {
      toast.error('Couldn’t update the plan', e instanceof Error ? e.message : undefined)
    }
  }

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2.5 rounded-2xl bg-muted/70 px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-ink" />
        These switches decide which self-service actions customers see on their subscriptions. An action that is switched off is hidden
        from the customer portal.
      </p>
      <Card className="overflow-hidden">
        <Table className="min-w-[860px]">
          <TableHeader>
            <tr>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Subscribers</TableHead>
              {columns.map((c) => (
                <TableHead key={c.key} className="text-center">
                  {c.label}
                </TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {plans.map((p, i) => (
              <TableRow key={p.id} index={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProductIcon icon={p.id as ProductIconKey} className="size-10 rounded-xl" />
                    <div className="min-w-0">
                      <p className="truncate font-bold">{p.productName}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.planName}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="tabular whitespace-nowrap text-right font-semibold">
                  {formatCurrency(p.price)}
                  <span className="text-xs font-normal text-muted-foreground"> / {cycleUnit[p.billingCycle]}</span>
                </TableCell>
                <TableCell className="tabular text-right text-muted-foreground">{p.subscribers}</TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    <div className="flex justify-center">
                      <Switch
                        checked={p.permissions[c.key]}
                        aria-label={`${p.productName} ${p.planName}: customers can ${c.verb}`}
                        onCheckedChange={(on) => void toggle(p, c.key, c.verb, on)}
                      />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

export default function PlansPage() {
  useDocumentTitle('Plans')
  const { state, reload, setData } = useAsync(() => api.listPlans())
  return (
    <AsyncView
      state={state}
      onRetry={reload}
      skeleton={
        <Card>
          <TableSkeleton rows={6} cols={7} />
        </Card>
      }
    >
      {(plans) => <PlansContent plans={plans} onChange={(u) => setData((all) => all.map((p) => (p.id === u.id ? u : p)))} />}
    </AsyncView>
  )
}
