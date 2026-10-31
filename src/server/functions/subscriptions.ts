import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '~/db/client'
import {
  customers,
  paymentTerms,
  plans,
  quotationTemplates,
  subscriptionLines,
  subscriptions,
} from '~/db/schema'
import { loadCatalogue } from '~/server/catalogue'
import { clock } from '~/server/clock'
import { addDays } from '~/server/domain/dates'
import {
  lineError,
  mergeLines,
  planError,
  planLine,
  productLine,
  renewalDates,
  totals,
} from '~/server/domain/subscription'
import {
  allowedActions,
  canEditLines,
  type SubscriptionContext,
  transition,
} from '~/server/domain/subscription-state'
import { taxOn } from '~/server/domain/tax'
import { containsPattern, requireFound, requireUuid } from '~/server/not-found'
import { getQuotation, sendQuotation } from '~/server/quotations'
import { getSessionUser, requireRole } from '~/server/session'
import {
  loadSubscriptionContext as loadContext,
  lockSubscription,
  performSubscriptionAction,
} from '~/server/subscription-core'
import { listSubscriptionEvents, recordSubscriptionEvents } from '~/server/subscription-events'
import type { ActionResult } from '~/shared/result'
import { idInput } from '~/shared/schemas/fields'
import { PAGE_SIZE } from '~/shared/schemas/pagination'
import {
  createSubscriptionSchema,
  subscriptionActionSchema,
  subscriptionListSchema,
  updateLinesSchema,
} from '~/shared/schemas/subscriptions'

export const listSubscriptions = createServerFn({ method: 'GET' })
  .validator(subscriptionListSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const pattern = data.q ? containsPattern(data.q) : undefined
    const where = and(
      pattern
        ? or(
            ilike(subscriptions.number, pattern),
            ilike(customers.name, pattern),
            ilike(customers.company, pattern),
          )
        : undefined,
      data.status ? eq(subscriptions.status, data.status) : undefined,
      data.planId ? eq(subscriptions.planId, data.planId) : undefined,
      data.customerId ? eq(subscriptions.customerId, data.customerId) : undefined,
    )
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: subscriptions.id,
          number: subscriptions.number,
          status: subscriptions.status,
          startDate: subscriptions.startDate,
          expiryDate: subscriptions.expiryDate,
          customerName: customers.name,
          planName: plans.name,
          amount: sql<number>`(
            select coalesce(sum(${subscriptionLines.amount}), 0)::bigint from ${subscriptionLines}
            where ${subscriptionLines.subscriptionId} = ${subscriptions.id}
          )`.mapWith(Number),
        })
        .from(subscriptions)
        .innerJoin(customers, eq(customers.id, subscriptions.customerId))
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .where(where)
        .orderBy(desc(subscriptions.number))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db
        .select({ total: count() })
        .from(subscriptions)
        .innerJoin(customers, eq(customers.id, subscriptions.customerId))
        .where(where),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })

export const getSubscription = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const id = requireUuid(data.id)
    const found = requireFound((await loadContext(db, id)) ?? undefined)

    const renewedFrom = alias(subscriptions, 'renewed_from')
    const [details] = await db
      .select({
        customerName: customers.name,
        customerCompany: customers.company,
        customerEmail: customers.email,
        termName: paymentTerms.name,
        templateName: quotationTemplates.name,
        renewedFromNumber: renewedFrom.number,
      })
      .from(subscriptions)
      .innerJoin(customers, eq(customers.id, subscriptions.customerId))
      .innerJoin(paymentTerms, eq(paymentTerms.id, subscriptions.paymentTermId))
      .leftJoin(quotationTemplates, eq(quotationTemplates.id, subscriptions.templateId))
      .leftJoin(renewedFrom, eq(renewedFrom.id, subscriptions.renewedFromId))
      .where(eq(subscriptions.id, id))

    const lines = await db
      .select()
      .from(subscriptionLines)
      .where(eq(subscriptionLines.subscriptionId, id))
      // The plan's base fee has no product and always comes first.
      .orderBy(sql`${subscriptionLines.productId} is not null`, asc(subscriptionLines.description))

    return {
      ...found.subscription,
      ...details,
      plan: found.plan,
      renewalId: found.renewalId,
      renewalNumber: found.renewalNumber,
      lines: lines.map((line) => ({
        ...line,
        taxAmount: taxOn(line.amount, line.taxRatePercent),
      })),
      totals: totals(lines),
      actions: allowedActions(found.context),
      canEditLines: canEditLines(found.subscription.status),
      quotationExpired:
        found.subscription.status === 'quotation' && !transition(found.context, 'confirm').ok,
      today: found.context.today,
    }
  })

export const createSubscription = createServerFn({ method: 'POST' })
  .validator(createSubscriptionSchema)
  .handler(async ({ data }): Promise<ActionResult<{ id: string }>> => {
    const user = await requireRole('admin', 'staff')
    const { lines, planQuantity, ...values } = data

    const [plan] = await db.select().from(plans).where(eq(plans.id, data.planId))
    if (!plan) return { ok: false, fieldErrors: { planId: 'Choose a plan' } }
    const catalogue = await loadCatalogue(db, lines)
    const problem = planError(plan, data) ?? lineError(lines, catalogue)
    if (problem) return { ok: false, fieldErrors: { [problem.field]: problem.message } }

    const [template] = data.templateId
      ? await db.select().from(quotationTemplates).where(eq(quotationTemplates.id, data.templateId))
      : []

    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(subscriptions)
        .values({
          ...values,
          createdBy: user.id,
          quotationValidUntil: template ? addDays(clock.today(), template.validityDays) : null,
        })
        .returning({ id: subscriptions.id })
      await recordSubscriptionEvents(tx, [
        {
          subscriptionId: created.id,
          action: 'created',
          fromStatus: null,
          toStatus: 'draft',
          actorId: user.id,
        },
      ])
      const priced = [
        planLine(plan, planQuantity, catalogue.taxRules),
        ...lines.map((line) => productLine(line, catalogue)),
      ]
      await tx
        .insert(subscriptionLines)
        .values(priced.map((line) => ({ ...line, subscriptionId: created.id })))
      return created.id
    })
    return { ok: true, data: { id } }
  })

export const updateSubscriptionLines = createServerFn({ method: 'POST' })
  .validator(updateLinesSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await requireRole('admin', 'staff')
    return db.transaction(async (tx) => {
      await lockSubscription(tx, data.id)
      const found = await loadContext(tx, data.id)
      if (!found) return { ok: false, error: 'This subscription no longer exists' }
      if (!canEditLines(found.subscription.status)) {
        return { ok: false, error: 'Lines can only change while in draft or quotation' }
      }

      const catalogue = await loadCatalogue(tx, data.lines)
      const problem =
        planError(found.plan, {
          startDate: found.subscription.startDate,
          planQuantity: data.planQuantity,
        }) ?? lineError(data.lines, catalogue)
      if (problem) return { ok: false, fieldErrors: { [problem.field]: problem.message } }

      const existing = await tx
        .select()
        .from(subscriptionLines)
        .where(eq(subscriptionLines.subscriptionId, data.id))
      const merged = mergeLines(existing, data.planQuantity, data.lines, catalogue)

      await tx.delete(subscriptionLines).where(eq(subscriptionLines.subscriptionId, data.id))
      await tx.insert(subscriptionLines).values(
        merged.map((line) => ({
          subscriptionId: data.id,
          productId: line.productId,
          variantId: line.variantId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRatePercent: line.taxRatePercent,
          amount: line.amount,
        })),
      )
      await recordSubscriptionEvents(tx, [
        {
          subscriptionId: data.id,
          action: 'lines_updated',
          fromStatus: found.subscription.status,
          toStatus: found.subscription.status,
          actorId: user.id,
        },
      ])
      return { ok: true, data: undefined }
    })
  })

export const runSubscriptionAction = createServerFn({ method: 'POST' })
  .validator(subscriptionActionSchema)
  .handler(async ({ data }): Promise<ActionResult<{ id: string }>> => {
    const user = await requireRole('admin', 'staff')
    return performSubscriptionAction(db, { ...data, actorId: user.id })
  })

export const sendQuotationFn = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }): Promise<ActionResult<{ to: string }>> => {
    const user = await requireRole('admin', 'staff')
    return sendQuotation(db, { id: requireUuid(data.id), actorId: user.id })
  })

/** The print page is shared: staff may print any quotation, a customer only their own. */
export const getQuotationDocument = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw notFound()
    const id = requireUuid(data.id)

    let scope: { customerId: string } | undefined
    if (user.role === 'customer') {
      const [own] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.userId, user.id))
      scope = { customerId: requireFound(own).id }
    }
    return requireFound(await getQuotation(db, id, scope))
  })

export const getSubscriptionEvents = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    return listSubscriptionEvents(db, requireUuid(data.id))
  })
