import { z } from 'zod'
import { dateSchema } from './fields'
import { INVOICE_STATUSES } from './invoices'
import { SUBSCRIPTION_STATUSES } from './subscriptions'

const optionalDateFilter = z
  .union([z.literal(''), dateSchema])
  .optional()
  .catch(undefined)
  .transform((value) => value || undefined)

const page = z.coerce.number().int().min(1).catch(1)

/** Filters shared by every part of the dashboard. They arrive from the URL, so bad input is dropped. */
export const dashboardFilterSchema = z.object({
  from: optionalDateFilter,
  to: optionalDateFilter,
  planId: z.uuid().optional().catch(undefined),
  customerId: z.uuid().optional().catch(undefined),
  status: z.enum(SUBSCRIPTION_STATUSES).optional().catch(undefined),
  /** An invoice's stored status, or overdue, which is worked out from its due date. */
  invoiceStatus: z
    .enum([...INVOICE_STATUSES, 'overdue'])
    .optional()
    .catch(undefined),
})

export const dashboardTableSchema = dashboardFilterSchema.extend({ page })

/** The page URL carries one page number per table, so each table paginates on its own. */
export const dashboardSearchSchema = dashboardFilterSchema.extend({
  payPage: page,
  overduePage: page,
  subPage: page,
  invoicePage: page,
})

export type DashboardFilters = z.output<typeof dashboardFilterSchema>
