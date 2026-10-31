import { createServerFn } from '@tanstack/react-start'
import { asc, count, eq, getTableColumns, ilike, sql } from 'drizzle-orm'
import { db } from '~/db/client'
import { paymentTerms, plans, quotationTemplateLines, quotationTemplates } from '~/db/schema'
import { loadCatalogue } from '~/server/catalogue'
import { lineError } from '~/server/domain/subscription'
import { containsPattern, requireFound, requireUuid } from '~/server/not-found'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { idInput } from '~/shared/schemas/fields'
import { listSearchSchema, PAGE_SIZE } from '~/shared/schemas/pagination'
import { templateSchema } from '~/shared/schemas/subscriptions'

export const listTemplates = createServerFn({ method: 'GET' })
  .validator(listSearchSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const where = data.q ? ilike(quotationTemplates.name, containsPattern(data.q)) : undefined
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          ...getTableColumns(quotationTemplates),
          planName: plans.name,
          termName: paymentTerms.name,
          lineCount: sql<number>`(
            select count(*)::int from ${quotationTemplateLines}
            where ${quotationTemplateLines.templateId} = ${quotationTemplates.id}
          )`,
        })
        .from(quotationTemplates)
        .innerJoin(plans, eq(plans.id, quotationTemplates.planId))
        .innerJoin(paymentTerms, eq(paymentTerms.id, quotationTemplates.paymentTermId))
        .where(where)
        .orderBy(asc(quotationTemplates.name))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(quotationTemplates).where(where),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })

export const getTemplate = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const id = requireUuid(data.id)
    const [template] = await db
      .select()
      .from(quotationTemplates)
      .where(eq(quotationTemplates.id, id))
    const lines = await db
      .select()
      .from(quotationTemplateLines)
      .where(eq(quotationTemplateLines.templateId, id))
    return { ...requireFound(template), lines }
  })

export const saveTemplate = createServerFn({ method: 'POST' })
  .validator(templateSchema)
  .handler(async ({ data }): Promise<ActionResult<{ id: string }>> => {
    await requireRole('admin', 'staff')
    const { id, lines, ...values } = data

    const problem = lineError(lines, await loadCatalogue(db, lines))
    if (problem) return { ok: false, fieldErrors: { [problem.field]: problem.message } }

    const templateId = await db.transaction(async (tx) => {
      const savedId = id
        ? (
            await tx
              .update(quotationTemplates)
              .set(values)
              .where(eq(quotationTemplates.id, id))
              .returning({ id: quotationTemplates.id })
          )[0].id
        : (
            await tx
              .insert(quotationTemplates)
              .values(values)
              .returning({ id: quotationTemplates.id })
          )[0].id

      await tx.delete(quotationTemplateLines).where(eq(quotationTemplateLines.templateId, savedId))
      if (lines.length) {
        await tx.insert(quotationTemplateLines).values(
          lines.map((line) => ({
            templateId: savedId,
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
          })),
        )
      }
      return savedId
    })
    return { ok: true, data: { id: templateId } }
  })
