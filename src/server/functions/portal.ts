import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { asc } from 'drizzle-orm'
import { db } from '~/db/client'
import { plans } from '~/db/schema'
import { clock } from '~/server/clock'
import { planAvailableOn } from '~/server/domain/subscription'
import { getInvoice, listInvoices } from '~/server/invoice-queries'
import { requireUuid } from '~/server/not-found'
import {
  CUSTOMER_ACTION_STATUSES,
  CUSTOMER_ACTIONS,
  customerForUser,
  getOverview,
  getPortalSubscription,
  listPortalPayments,
  listPortalSubscriptions,
  saveProfile,
} from '~/server/portal'
import { requireRole } from '~/server/session'
import { performSubscriptionAction } from '~/server/subscription-core'
import type { ActionResult } from '~/shared/result'
import { idInput } from '~/shared/schemas/fields'
import {
  portalActionSchema,
  portalInvoiceListSchema,
  portalListSchema,
  portalSubscriptionListSchema,
  profileSchema,
} from '~/shared/schemas/portal'

/** The signed-in customer and their record. Every portal query is scoped by this id. */
async function requireCustomer() {
  const user = await requireRole('customer')
  const customer = await customerForUser(db, user.id)
  if (!customer) throw notFound()
  return { user, customer }
}

export const listMySubscriptions = createServerFn({ method: 'GET' })
  .validator(portalSubscriptionListSchema)
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()
    return listPortalSubscriptions(db, customer.id, data.page, data.group)
  })

export const getMySubscription = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()
    const found = await getPortalSubscription(db, customer.id, requireUuid(data.id))
    if (!found) throw notFound()
    return found
  })

export const runMyAction = createServerFn({ method: 'POST' })
  .validator(portalActionSchema)
  .handler(async ({ data }): Promise<ActionResult<{ id: string }>> => {
    const { user, customer } = await requireCustomer()
    return performSubscriptionAction(db, {
      ...data,
      actorId: user.id,
      customerId: customer.id,
      allowed: CUSTOMER_ACTIONS,
      statuses: CUSTOMER_ACTION_STATUSES,
    })
  })

export const listMyInvoices = createServerFn({ method: 'GET' })
  .validator(portalInvoiceListSchema)
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()
    return listInvoices(db, data, { customerId: customer.id })
  })

export const getMyInvoice = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()
    const found = await getInvoice(db, requireUuid(data.id), { customerId: customer.id })
    if (!found) throw notFound()
    return {
      invoice: found.invoice,
      lines: found.lines,
      // Who on staff took a payment, and their notes, are not for the customer.
      payments: found.payments.map(({ id, paidOn, amount, method }) => ({
        id,
        paidOn,
        amount,
        method,
      })),
    }
  })

export const getMyProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const { customer } = await requireCustomer()
  return customer
})

export const updateMyProfile = createServerFn({ method: 'POST' })
  .validator(profileSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const { user, customer } = await requireCustomer()
    return saveProfile(db, { userId: user.id, customerId: customer.id }, data)
  })

/** Plans a customer could take out today: active, and inside their availability dates. */
export const listAvailablePlans = createServerFn({ method: 'GET' }).handler(async () => {
  await requireCustomer()
  const today = clock.today()
  const rows = await db.select().from(plans).orderBy(asc(plans.billingPeriod), asc(plans.price))
  return {
    today,
    plans: rows
      .filter((plan) => planAvailableOn(plan, today))
      .map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        billingPeriod: plan.billingPeriod,
        minQuantity: plan.minQuantity,
        availableTo: plan.availableTo,
        pausable: plan.pausable,
        closable: plan.closable,
        renewable: plan.renewable,
        autoClose: plan.autoClose,
      })),
  }
})

export const getMyOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const { customer } = await requireCustomer()
  return { ...(await getOverview(db, customer.id)), customerName: customer.name }
})

export const listMyPayments = createServerFn({ method: 'GET' })
  .validator(portalListSchema)
  .handler(async ({ data }) => {
    const { customer } = await requireCustomer()
    return listPortalPayments(db, customer.id, data.page)
  })
