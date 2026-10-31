import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { db } from '~/db/client'
import {
  customers,
  paymentTerms,
  plans,
  products,
  productVariants,
  quotationTemplateLines,
  quotationTemplates,
  taxRules,
} from '~/db/schema'
import { clock } from '~/server/clock'
import { resolveTaxRate } from '~/server/domain/tax'
import { requireRole } from '~/server/session'

/** Everything the template and subscription forms offer in their pickers. */
export const getFormOptions = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole('admin', 'staff')
  const [productRows, variantRows, rules, planRows, termRows, customerRows, templates, lines] =
    await Promise.all([
      db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.name)),
      db.select().from(productVariants).orderBy(asc(productVariants.value)),
      db.select().from(taxRules),
      db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.price)),
      db.select().from(paymentTerms).orderBy(asc(paymentTerms.daysDue)),
      db
        .select({ id: customers.id, name: customers.name, company: customers.company })
        .from(customers)
        .orderBy(asc(customers.name)),
      db.select().from(quotationTemplates).orderBy(asc(quotationTemplates.name)),
      db.select().from(quotationTemplateLines),
    ])

  return {
    today: clock.today(),
    products: productRows.map((product) => ({
      id: product.id,
      name: product.name,
      salesPrice: product.salesPrice,
      taxRatePercent: resolveTaxRate(product, rules),
      variants: variantRows
        .filter((variant) => variant.productId === product.id)
        .map((variant) => ({
          id: variant.id,
          label: `${variant.attribute}: ${variant.value}`,
          extraPrice: variant.extraPrice,
        })),
    })),
    planTaxRatePercent: resolveTaxRate(null, rules),
    plans: planRows.map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      billingPeriod: plan.billingPeriod,
      minQuantity: plan.minQuantity,
    })),
    paymentTerms: termRows.map((term) => ({ id: term.id, name: term.name })),
    customers: customerRows,
    templates: templates.map((template) => ({
      ...template,
      lines: lines.filter((line) => line.templateId === template.id),
    })),
  }
})
