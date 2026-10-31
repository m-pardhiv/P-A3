import bcrypt from 'bcryptjs'
import { addMonths, format, parseISO } from 'date-fns'
import { eq } from 'drizzle-orm'
import { runBilling } from '~/server/billing-run'
import { clock } from '~/server/clock'
import { periodStart } from '~/server/domain/billing'
import { addDays } from '~/server/domain/dates'
import { type Catalogue, planLine, productLine } from '~/server/domain/subscription'
import { env } from '~/server/env'
import { recordPayment } from '~/server/payments'
import { createDb } from './client'
import {
  customers,
  discounts,
  invoices,
  paymentTerms,
  plans,
  products,
  productVariants,
  quotationTemplateLines,
  quotationTemplates,
  subscriptionEvents,
  subscriptionLines,
  subscriptions,
  taxRules,
  users,
} from './schema'
import { seedBlocker } from './seed-guard'

const DEMO_PASSWORD = 'Brightloop@2026'
const paise = (rupees: number) => Math.round(rupees * 100)
const today = clock.today()
const monthsFromToday = (months: number) => format(addMonths(parseISO(today), months), 'yyyy-MM-dd')

/**
 * A start date whose monthly cycle lands exactly on today, so the next billing run has work to do.
 * On the 31st, "4 months ago" is a 30-day month, so it looks further back until the days line up.
 */
function monthlyStartDueToday(atLeastMonths: number) {
  for (let months = atLeastMonths; months < atLeastMonths + 12; months++) {
    const start = monthsFromToday(-months)
    if (periodStart(start, 'monthly', months) === today) return start
  }
  return monthsFromToday(-atLeastMonths)
}

const db = createDb(1)
const client = db.$client

// --empty wipes everything and keeps only the admin and staff logins, for a build-it-live start.
const empty = process.argv.includes('--empty')
const reset = process.argv.includes('--reset') || empty
const blocker = seedBlocker({
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  reset,
  allowDemoSeed: process.env.ALLOW_DEMO_SEED === 'true',
  allowReset: process.env.ALLOW_DB_RESET === 'true',
})
if (blocker) {
  await client.end()
  throw new Error(blocker)
}

const existing = await db.select({ id: users.id }).from(users).limit(1)
if (existing.length > 0 && !reset) {
  console.log('Database already has data. Run `pnpm db:seed --reset` to wipe it and reseed.')
  await client.end()
  process.exit(0)
}

if (reset) {
  await client`TRUNCATE users, customers, products, plans, tax_rules, payment_terms RESTART IDENTITY CASCADE`
  // These sequences are not owned by a column, so TRUNCATE leaves them running.
  await client`ALTER SEQUENCE subscription_number_seq RESTART`
  await client`ALTER SEQUENCE invoice_number_seq RESTART`
}

const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

if (empty) {
  await db.insert(users).values([
    { email: 'admin@brightloop.example', name: 'Meera Iyer', passwordHash, role: 'admin' },
    { email: 'staff@brightloop.example', name: 'Rohan Kulkarni', passwordHash, role: 'staff' },
  ])
  console.log(`
Clean start. No products, plans, customers, subscriptions or invoices.
Sign in with (password ${DEMO_PASSWORD}):
  admin     admin@brightloop.example
  staff     staff@brightloop.example
Customers can sign up themselves on the sign-up page.
`)
  await client.end()
  process.exit(0)
}

const { adminId, staffId } = await db.transaction(async (tx) => {
  const [admin, staff] = await tx
    .insert(users)
    .values([
      { email: 'admin@brightloop.example', name: 'Meera Iyer', passwordHash, role: 'admin' },
      { email: 'staff@brightloop.example', name: 'Rohan Kulkarni', passwordHash, role: 'staff' },
    ])
    .returning({ id: users.id })

  const demoCustomers = [
    { name: 'Asha Rao', company: 'Rao Textiles', phone: '+91 98450 10001', city: 'Bengaluru' },
    { name: 'Vikram Shah', company: 'Shah Logistics', phone: '+91 98200 10002', city: 'Mumbai' },
    { name: 'Neha Verma', company: 'Verma Foods', phone: '+91 98100 10003', city: 'Delhi' },
    { name: 'Arjun Menon', company: 'Menon Traders', phone: '+91 94470 10004', city: 'Kochi' },
    { name: 'Priya Nair', company: 'Nair Clinics', phone: '+91 98940 10005', city: 'Chennai' },
  ]
  const customerIds: string[] = []
  for (const customer of demoCustomers) {
    const email = `${customer.name.split(' ')[0].toLowerCase()}@customer.example`
    const [user] = await tx
      .insert(users)
      .values({ email, name: customer.name, passwordHash, role: 'customer' })
      .returning({ id: users.id })
    const [created] = await tx
      .insert(customers)
      .values({
        userId: user.id,
        name: customer.name,
        company: customer.company,
        email,
        phone: customer.phone,
        address: customer.city,
      })
      .returning({ id: customers.id })
    customerIds.push(created.id)
  }
  const [asha, vikram, neha, arjun, priya] = customerIds

  const [crm, support, cloud, training] = await tx
    .insert(products)
    .values([
      {
        name: 'Brightloop CRM seat',
        type: 'software',
        salesPrice: paise(1200),
        costPrice: paise(300),
      },
      {
        name: 'Priority support',
        type: 'service',
        salesPrice: paise(2500),
        costPrice: paise(900),
      },
      { name: 'Cloud storage', type: 'software', salesPrice: paise(800), costPrice: paise(250) },
      {
        name: 'Team training session',
        type: 'training',
        salesPrice: paise(5000),
        costPrice: paise(2000),
        notes: 'Taxed at the 5% training rate.',
      },
    ])
    .returning()

  const [odoo, , support24x7, , cloud1tb] = await tx
    .insert(productVariants)
    .values([
      { productId: crm.id, attribute: 'Brand', value: 'Odoo', extraPrice: paise(560) },
      { productId: crm.id, attribute: 'Brand', value: 'Zoho', extraPrice: paise(420) },
      { productId: support.id, attribute: 'Hours', value: '24x7', extraPrice: paise(1500) },
      { productId: cloud.id, attribute: 'Capacity', value: '100 GB', extraPrice: 0 },
      { productId: cloud.id, attribute: 'Capacity', value: '1 TB', extraPrice: paise(1400) },
      { productId: training.id, attribute: 'Format', value: 'On site', extraPrice: paise(3000) },
    ])
    .returning()

  const rules = await tx
    .insert(taxRules)
    .values([
      { name: 'GST 18%', ratePercent: 18, isDefault: true },
      { name: 'GST 5% training', ratePercent: 5, productType: 'training' },
    ])
    .returning()

  const [immediate, net15, net30] = await tx
    .insert(paymentTerms)
    .values([
      { name: 'Immediate', daysDue: 0 },
      { name: 'Net 15', daysDue: 15 },
      { name: 'Net 30', daysDue: 30 },
    ])
    .returning({ id: paymentTerms.id })

  const [daily, weekly, monthly, team, yearly] = await tx
    .insert(plans)
    .values([
      {
        name: 'Daily pass',
        price: paise(99),
        billingPeriod: 'daily',
        autoClose: true,
        closable: true,
        pausable: false,
        renewable: false,
      },
      {
        name: 'Weekly starter',
        price: paise(499),
        billingPeriod: 'weekly',
        autoClose: true,
        closable: true,
        pausable: true,
        renewable: true,
      },
      {
        name: 'Monthly standard',
        price: paise(1999),
        billingPeriod: 'monthly',
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true,
      },
      {
        name: 'Monthly team',
        price: paise(4999),
        billingPeriod: 'monthly',
        minQuantity: 5,
        autoClose: false,
        closable: false,
        pausable: true,
        renewable: true,
      },
      {
        name: 'Yearly business',
        price: paise(19999),
        billingPeriod: 'yearly',
        autoClose: false,
        closable: false,
        pausable: false,
        renewable: true,
      },
      {
        name: 'Launch offer',
        price: paise(999),
        billingPeriod: 'monthly',
        availableTo: monthsFromToday(-1),
        autoClose: false,
        closable: true,
        pausable: false,
        renewable: false,
      },
    ])
    .returning()

  const [starter, teamRollout] = await tx
    .insert(quotationTemplates)
    .values([
      { name: 'Starter quote', planId: monthly.id, paymentTermId: net15.id, validityDays: 30 },
      { name: 'Team rollout', planId: team.id, paymentTermId: net30.id, validityDays: 14 },
    ])
    .returning({ id: quotationTemplates.id })

  await tx.insert(quotationTemplateLines).values([
    { templateId: starter.id, productId: crm.id, variantId: odoo.id, quantity: 2 },
    { templateId: teamRollout.id, productId: crm.id, variantId: odoo.id, quantity: 5 },
    { templateId: teamRollout.id, productId: support.id, quantity: 1 },
    { templateId: teamRollout.id, productId: training.id, quantity: 1 },
  ])

  // Both start today, so the history below is untouched and the next billing run uses them.
  await tx.insert(discounts).values([
    {
      name: 'Welcome 10%',
      kind: 'percent',
      value: 10,
      minPurchaseAmount: paise(4000),
      startDate: today,
      endDate: addDays(today, 90),
      usageLimit: 10,
      scope: 'subscription',
    },
    {
      name: 'Storage saver',
      kind: 'fixed',
      value: paise(100),
      minQuantity: 2,
      startDate: today,
      endDate: addDays(today, 30),
      usageLimit: 3,
      scope: 'product',
      productId: cloud.id,
    },
  ])

  const catalogue: Catalogue = {
    products: new Map([crm, support, cloud, training].map((p) => [p.id, p])),
    variants: new Map([odoo, support24x7, cloud1tb].map((v) => [v.id, v])),
    taxRules: rules,
  }

  type DemoSubscription = {
    customerId: string
    plan: typeof monthly
    paymentTermId: string
    status: 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'closed'
    startDate: string
    expiryDate?: string
    planQuantity?: number
    lines?: { productId: string; variantId?: string; quantity: number }[]
    templateId?: string
    quotationValidUntil?: string
    createdBy?: string
  }

  const crmOdoo = (quantity: number) => ({ productId: crm.id, variantId: odoo.id, quantity })
  const supportLine = { productId: support.id, variantId: support24x7.id, quantity: 1 }
  const storageLine = { productId: cloud.id, variantId: cloud1tb.id, quantity: 2 }
  const trainingLine = { productId: training.id, quantity: 1 }

  const closedExpiry = monthsFromToday(-2)

  const demos: DemoSubscription[] = [
    {
      customerId: arjun,
      plan: monthly,
      paymentTermId: net15.id,
      status: 'closed',
      startDate: monthsFromToday(-7),
      expiryDate: closedExpiry,
      lines: [crmOdoo(1)],
    },
    {
      customerId: asha,
      plan: monthly,
      paymentTermId: net15.id,
      status: 'active',
      startDate: monthlyStartDueToday(4),
      expiryDate: monthsFromToday(8),
      lines: [crmOdoo(3), storageLine],
    },
    {
      customerId: vikram,
      plan: team,
      paymentTermId: net30.id,
      status: 'active',
      startDate: monthlyStartDueToday(3),
      planQuantity: 8,
      lines: [crmOdoo(8), supportLine],
      createdBy: staff.id,
    },
    {
      customerId: neha,
      plan: yearly,
      paymentTermId: net30.id,
      status: 'active',
      startDate: monthsFromToday(-2),
      expiryDate: monthsFromToday(10),
      lines: [trainingLine],
    },
    {
      customerId: arjun,
      plan: weekly,
      paymentTermId: immediate.id,
      status: 'active',
      startDate: addDays(today, -42),
      expiryDate: addDays(today, 42),
      createdBy: staff.id,
    },
    {
      customerId: priya,
      plan: daily,
      paymentTermId: immediate.id,
      status: 'active',
      startDate: addDays(today, -10),
      expiryDate: addDays(today, 20),
    },
    {
      customerId: neha,
      plan: monthly,
      paymentTermId: net15.id,
      status: 'paused',
      startDate: monthsFromToday(-3),
      expiryDate: monthsFromToday(9),
      lines: [storageLine],
    },
    {
      customerId: priya,
      plan: team,
      paymentTermId: net30.id,
      status: 'paused',
      startDate: monthsFromToday(-2),
      planQuantity: 5,
      createdBy: staff.id,
    },
    {
      customerId: vikram,
      plan: monthly,
      paymentTermId: net15.id,
      status: 'confirmed',
      startDate: addDays(today, -2),
      expiryDate: monthsFromToday(12),
      lines: [crmOdoo(2)],
      createdBy: staff.id,
    },
    {
      customerId: asha,
      plan: weekly,
      paymentTermId: immediate.id,
      status: 'confirmed',
      startDate: addDays(today, 14),
      expiryDate: addDays(today, 98),
    },
    {
      customerId: neha,
      plan: monthly,
      paymentTermId: net15.id,
      status: 'quotation',
      startDate: addDays(today, 7),
      expiryDate: monthsFromToday(12),
      lines: [crmOdoo(2)],
      templateId: starter.id,
      quotationValidUntil: addDays(today, 20),
      createdBy: staff.id,
    },
    {
      customerId: arjun,
      plan: team,
      paymentTermId: net30.id,
      status: 'quotation',
      startDate: addDays(today, 3),
      expiryDate: monthsFromToday(12),
      lines: [crmOdoo(5), { productId: support.id, quantity: 1 }, trainingLine],
      templateId: teamRollout.id,
      quotationValidUntil: addDays(today, -3),
    },
    {
      customerId: priya,
      plan: yearly,
      paymentTermId: net30.id,
      status: 'quotation',
      startDate: addDays(today, 10),
      expiryDate: monthsFromToday(12),
      lines: [supportLine],
    },
    {
      customerId: asha,
      plan: monthly,
      paymentTermId: net15.id,
      status: 'draft',
      startDate: addDays(today, 7),
      lines: [crmOdoo(1)],
      templateId: starter.id,
      quotationValidUntil: addDays(today, 30),
      createdBy: staff.id,
    },
    {
      customerId: vikram,
      plan: weekly,
      paymentTermId: immediate.id,
      status: 'draft',
      startDate: addDays(today, 5),
      lines: [storageLine],
    },
    {
      customerId: arjun,
      plan: monthly,
      paymentTermId: net15.id,
      status: 'draft',
      startDate: addDays(closedExpiry, 1),
      expiryDate: monthsFromToday(3),
      lines: [crmOdoo(1)],
    },
  ]

  const created: { id: string }[] = []
  for (const demo of demos) {
    const running = demo.status === 'active' || demo.status === 'paused'
    const [subscription] = await tx
      .insert(subscriptions)
      .values({
        customerId: demo.customerId,
        planId: demo.plan.id,
        templateId: demo.templateId,
        status: demo.status,
        startDate: demo.startDate,
        expiryDate: demo.expiryDate,
        nextInvoiceDate: running ? demo.startDate : null,
        paymentTermId: demo.paymentTermId,
        quotationValidUntil: demo.quotationValidUntil,
        createdBy: demo.createdBy ?? admin.id,
      })
      .returning({ id: subscriptions.id })
    created.push(subscription)

    // Give each demo subscription the history it would have had on the way to its status.
    const path = ['draft', 'quotation', 'confirmed', 'active'] as const
    const reached = demo.status === 'paused' || demo.status === 'closed' ? 'active' : demo.status
    const steps = path.slice(0, path.indexOf(reached) + 1)
    const trail = [
      { action: 'created', from: null, to: 'draft' as const },
      ...steps.slice(1).map((to, i) => ({
        action: { quotation: 'send', confirmed: 'confirm', active: 'activate' }[
          to as string
        ] as string,
        from: steps[i],
        to,
      })),
      ...(demo.status === 'paused' || demo.status === 'closed'
        ? [
            {
              action: demo.status === 'paused' ? 'pause' : 'close',
              from: 'active' as const,
              to: demo.status,
            },
          ]
        : []),
    ]
    await tx.insert(subscriptionEvents).values(
      trail.map((step) => ({
        subscriptionId: subscription.id,
        action: step.action,
        fromStatus: step.from,
        toStatus: step.to,
        actorId: demo.createdBy ?? admin.id,
      })),
    )

    const priced = [
      planLine(demo.plan, demo.planQuantity ?? demo.plan.minQuantity, rules),
      ...(demo.lines ?? []).map((line) =>
        productLine({ ...line, variantId: line.variantId ?? null }, catalogue),
      ),
    ]
    await tx
      .insert(subscriptionLines)
      .values(priced.map((line) => ({ ...line, subscriptionId: subscription.id })))
  }

  // The last draft is the renewal of the first, closed subscription.
  await tx
    .update(subscriptions)
    .set({ renewedFromId: created[0].id })
    .where(eq(subscriptions.id, created[created.length - 1].id))

  return { adminId: admin.id, staffId: staff.id }
})

// Billing history. Each run bills what was due on that date. Older invoices are confirmed and
// mostly paid, so some stay unpaid and become overdue; the newest are left as drafts.
const methods = ['upi', 'bank_transfer', 'card', 'cash', 'cheque'] as const

async function confirmAndSettle(leaveSomeDraft: boolean) {
  const drafts = await db
    .select()
    .from(invoices)
    .where(eq(invoices.status, 'draft'))
    .orderBy(invoices.number)

  for (const [i, invoice] of drafts.entries()) {
    if (leaveSomeDraft && i % 2 === 1) continue // stays a draft
    await db.update(invoices).set({ status: 'confirmed' }).where(eq(invoices.id, invoice.id))
    if (leaveSomeDraft) continue // confirmed, nothing paid yet

    const turn = i % 3
    if (turn === 2) continue // confirmed and unpaid: overdue once its due date passes
    const paidOn = addDays(invoice.issueDate, 3)
    await recordPayment(db, {
      invoiceId: invoice.id,
      method: methods[i % methods.length],
      amount: turn === 0 ? invoice.total : Math.round(invoice.total * 0.4),
      paidOn: paidOn > today ? today : paidOn,
      note: null,
      recordedBy: i % 2 === 0 ? adminId : staffId,
    })
  }
}

for (const [daysAgo, leaveSomeDraft] of [
  [75, false],
  [30, false],
  [1, true],
] as const) {
  await runBilling(db, { asOf: addDays(today, -daysAgo), triggeredBy: adminId })
  await confirmAndSettle(leaveSomeDraft)
}

console.log(`
Demo accounts (password for all: ${DEMO_PASSWORD})
  admin     admin@brightloop.example
  staff     staff@brightloop.example
  customer  asha@customer.example, vikram@customer.example, neha@customer.example,
            arjun@customer.example, priya@customer.example

Billing is up to date as of yesterday. Run billing for today on the Billing page to see the
next invoices, and the Welcome 10% and Storage saver discounts, apply.
`)

await client.end()
