import { createServerFn } from '@tanstack/react-start'
import { db } from '~/db/client'
import {
  getOverdueTable,
  getPaymentsTable,
  getSubscriptionsTable,
  getSummary,
} from '~/server/dashboard'
import { requireRole } from '~/server/session'
import { dashboardFilterSchema, dashboardTableSchema } from '~/shared/schemas/dashboard'

export const getDashboardSummary = createServerFn({ method: 'GET' })
  .validator(dashboardFilterSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    return getSummary(db, data)
  })

export const getDashboardPayments = createServerFn({ method: 'GET' })
  .validator(dashboardTableSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const { page, ...filters } = data
    return getPaymentsTable(db, filters, page)
  })

export const getDashboardOverdue = createServerFn({ method: 'GET' })
  .validator(dashboardTableSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const { page, ...filters } = data
    return getOverdueTable(db, filters, page)
  })

export const getDashboardSubscriptions = createServerFn({ method: 'GET' })
  .validator(dashboardTableSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const { page, ...filters } = data
    return getSubscriptionsTable(db, filters, page)
  })
