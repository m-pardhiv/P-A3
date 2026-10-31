import { sql } from 'drizzle-orm'
import { createDb, type Database } from '~/db/client'
import {
  customers,
  invoices,
  paymentTerms,
  plans,
  subscriptionLines,
  subscriptions,
  taxRules,
  users,
} from '~/db/schema'

export function openTestDb() {
  const database = createDb(2)
  return { database, close: () => database.$client.end() }
}

/** Stops a test that somehow reached a real database from wiping it. */
export async function assertTestDatabase(database: Database) {
  const rows = await database.execute<{ name: string }>(sql`select current_database() as name`)
  if (!rows[0].name.endsWith('_test')) {
    throw new Error(`Refusing to reset "${rows[0].name}": it is not a test database`)
  }
}

export async function resetDb(database: Database) {
  await assertTestDatabase(database)
  await database.execute(
    sql`truncate users, customers, products, plans, tax_rules, payment_terms restart identity cascade`,
  )
  await database.execute(sql`alter sequence subscription_number_seq restart`)
  await database.execute(sql`alter sequence invoice_number_seq restart`)
}

export const PLAN_PRICE = 100000
export const TAX_PERCENT = 18

/** An admin, two customers with logins, an 18% default tax rule and Net 15 terms. */
export async function baseData(database: Database) {
  const [admin] = await database
    .insert(users)
    .values({ email: 'admin@test.example', passwordHash: 'x', role: 'admin', name: 'Admin' })
    .returning()

  const customerRows = []
  for (const name of ['Customer A', 'Customer B']) {
    const email = `${name.replace(' ', '').toLowerCase()}@test.example`
    const [user] = await database
      .insert(users)
      .values({ email, passwordHash: 'x', role: 'customer', name })
      .returning()
    const [customer] = await database
      .insert(customers)
      .values({ userId: user.id, name, email })
      .returning()
    customerRows.push({ user, customer })
  }

  await database.insert(taxRules).values({ name: 'GST', ratePercent: TAX_PERCENT, isDefault: true })
  const [term] = await database
    .insert(paymentTerms)
    .values({ name: 'Net 15', daysDue: 15 })
    .returning()

  return { admin, a: customerRows[0], b: customerRows[1], term }
}

export async function addPlan(
  database: Database,
  overrides: Partial<typeof plans.$inferInsert> = {},
) {
  const [plan] = await database
    .insert(plans)
    .values({ name: 'Monthly', price: PLAN_PRICE, billingPeriod: 'monthly', ...overrides })
    .returning()
  return plan
}

export async function addSubscription(
  database: Database,
  input: {
    customerId: string
    plan: typeof plans.$inferSelect
    termId: string
    startDate: string
    expiryDate?: string | null
    status?: 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'closed'
    quantity?: number
  },
) {
  const status = input.status ?? 'active'
  const [subscription] = await database
    .insert(subscriptions)
    .values({
      customerId: input.customerId,
      planId: input.plan.id,
      paymentTermId: input.termId,
      status,
      startDate: input.startDate,
      expiryDate: input.expiryDate ?? null,
      nextInvoiceDate: status === 'active' ? input.startDate : null,
    })
    .returning()
  const quantity = input.quantity ?? 1
  await database.insert(subscriptionLines).values({
    subscriptionId: subscription.id,
    description: input.plan.name,
    quantity,
    unitPrice: input.plan.price,
    taxRatePercent: TAX_PERCENT,
    amount: input.plan.price * quantity,
  })
  return subscription
}

export async function addInvoice(
  database: Database,
  input: {
    subscriptionId: string
    customerId: string
    status?: 'draft' | 'confirmed' | 'paid' | 'cancelled'
    total?: number
    amountPaid?: number
    periodStart?: string
    issueDate?: string
  },
) {
  const total = input.total ?? 118000
  const periodStart = input.periodStart ?? '2026-01-01'
  const [invoice] = await database
    .insert(invoices)
    .values({
      subscriptionId: input.subscriptionId,
      customerId: input.customerId,
      periodStart,
      periodEnd: periodStart,
      status: input.status ?? 'confirmed',
      issueDate: input.issueDate ?? periodStart,
      dueDate: input.issueDate ?? periodStart,
      subtotal: total,
      total,
      amountPaid: input.amountPaid ?? 0,
    })
    .returning()
  return invoice
}
