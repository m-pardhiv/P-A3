import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Every table calls enableRLS() and has no policies. Supabase exposes `public` through its
// Data API, so RLS blocks that route. The app connects as the table owner and is unaffected.

/** Money is always integer paise. */
const money = (name: string) => bigint(name, { mode: 'number' })
const percent = (name: string) => numeric(name, { precision: 5, scale: 2, mode: 'number' })
const id = () => uuid('id').primaryKey().defaultRandom()
const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`)

export const userRole = pgEnum('user_role', ['admin', 'staff', 'customer'])
export const billingPeriod = pgEnum('billing_period', ['daily', 'weekly', 'monthly', 'yearly'])
export const discountKind = pgEnum('discount_kind', ['percent', 'fixed'])
export const discountScope = pgEnum('discount_scope', ['product', 'subscription'])
export const subscriptionStatus = pgEnum('subscription_status', [
  'draft',
  'quotation',
  'confirmed',
  'active',
  'paused',
  'closed',
])
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'confirmed', 'paid', 'cancelled'])
export const paymentMethod = pgEnum('payment_method', [
  'cash',
  'bank_transfer',
  'card',
  'upi',
  'cheque',
])

export const subscriptionNumberSeq = pgSequence('subscription_number_seq')
export const invoiceNumberSeq = pgSequence('invoice_number_seq')

export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull(),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`)],
).enableRLS()

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
).enableRLS()

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('password_reset_tokens_user_id_idx').on(t.userId)],
).enableRLS()

export const customers = pgTable(
  'customers',
  {
    id: id(),
    userId: uuid('user_id')
      .unique()
      .references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    company: text('company'),
    email: text('email').notNull(),
    phone: text('phone'),
    address: text('address'),
    createdAt: createdAt(),
  },
  (t) => [index('customers_name_idx').on(t.name)],
).enableRLS()

export const products = pgTable(
  'products',
  {
    id: id(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    salesPrice: money('sales_price').notNull(),
    costPrice: money('cost_price').notNull().default(0),
    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check('products_sales_price_check', sql`${t.salesPrice} >= 0`),
    check('products_cost_price_check', sql`${t.costPrice} >= 0`),
  ],
).enableRLS()

export const productVariants = pgTable(
  'product_variants',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    attribute: text('attribute').notNull(),
    value: text('value').notNull(),
    extraPrice: money('extra_price').notNull().default(0),
  },
  (t) => [
    uniqueIndex('product_variants_unique_idx').on(t.productId, t.attribute, t.value),
    check('product_variants_extra_price_check', sql`${t.extraPrice} >= 0`),
  ],
).enableRLS()

export const taxRules = pgTable(
  'tax_rules',
  {
    id: id(),
    name: text('name').notNull(),
    ratePercent: percent('rate_percent').notNull(),
    productType: text('product_type'),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
    isDefault: boolean('is_default').notNull().default(false),
    active: boolean('active').notNull().default(true),
  },
  (t) => [
    uniqueIndex('tax_rules_one_default_idx')
      .on(t.isDefault)
      .where(sql`${t.isDefault} AND ${t.active}`),
    check('tax_rules_rate_check', sql`${t.ratePercent} >= 0 AND ${t.ratePercent} <= 100`),
  ],
).enableRLS()

export const paymentTerms = pgTable(
  'payment_terms',
  {
    id: id(),
    name: text('name').notNull().unique(),
    daysDue: integer('days_due').notNull(),
  },
  (t) => [check('payment_terms_days_due_check', sql`${t.daysDue} >= 0`)],
).enableRLS()

export const plans = pgTable(
  'plans',
  {
    id: id(),
    name: text('name').notNull(),
    price: money('price').notNull(),
    billingPeriod: billingPeriod('billing_period').notNull(),
    minQuantity: integer('min_quantity').notNull().default(1),
    availableFrom: date('available_from'),
    availableTo: date('available_to'),
    autoClose: boolean('auto_close').notNull().default(false),
    closable: boolean('closable').notNull().default(true),
    pausable: boolean('pausable').notNull().default(false),
    renewable: boolean('renewable').notNull().default(true),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check('plans_price_check', sql`${t.price} >= 0`),
    check('plans_min_quantity_check', sql`${t.minQuantity} > 0`),
    check('plans_availability_check', sql`${t.availableTo} >= ${t.availableFrom}`),
  ],
).enableRLS()

export const discounts = pgTable(
  'discounts',
  {
    id: id(),
    name: text('name').notNull(),
    kind: discountKind('kind').notNull(),
    /** Whole percent when kind is percent, paise when kind is fixed. */
    value: bigint('value', { mode: 'number' }).notNull(),
    minPurchaseAmount: money('min_purchase_amount').notNull().default(0),
    minQuantity: integer('min_quantity').notNull().default(1),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    usageLimit: integer('usage_limit').notNull(),
    usedCount: integer('used_count').notNull().default(0),
    scope: discountScope('scope').notNull(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'restrict' }),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check('discounts_value_check', sql`${t.value} > 0`),
    check('discounts_percent_check', sql`${t.kind} <> 'percent' OR ${t.value} <= 100`),
    check('discounts_min_purchase_check', sql`${t.minPurchaseAmount} >= 0`),
    check('discounts_min_quantity_check', sql`${t.minQuantity} > 0`),
    check('discounts_dates_check', sql`${t.endDate} >= ${t.startDate}`),
    check(
      'discounts_used_count_check',
      sql`${t.usedCount} >= 0 AND ${t.usedCount} <= ${t.usageLimit}`,
    ),
    check(
      'discounts_product_scope_check',
      sql`${t.scope} <> 'product' OR ${t.productId} IS NOT NULL`,
    ),
  ],
).enableRLS()

export const quotationTemplates = pgTable(
  'quotation_templates',
  {
    id: id(),
    name: text('name').notNull(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    paymentTermId: uuid('payment_term_id')
      .notNull()
      .references(() => paymentTerms.id, { onDelete: 'restrict' }),
    validityDays: integer('validity_days').notNull(),
    createdAt: createdAt(),
  },
  (t) => [check('quotation_templates_validity_check', sql`${t.validityDays} > 0`)],
).enableRLS()

export const quotationTemplateLines = pgTable(
  'quotation_template_lines',
  {
    id: id(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => quotationTemplates.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
  },
  (t) => [
    index('quotation_template_lines_template_id_idx').on(t.templateId),
    check('quotation_template_lines_quantity_check', sql`${t.quantity} > 0`),
  ],
).enableRLS()

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    number: text('number')
      .notNull()
      .unique()
      .default(sql`'SUB-' || lpad(nextval('subscription_number_seq')::text, 5, '0')`),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    templateId: uuid('template_id').references(() => quotationTemplates.id, {
      onDelete: 'set null',
    }),
    status: subscriptionStatus('status').notNull().default('draft'),
    startDate: date('start_date').notNull(),
    expiryDate: date('expiry_date'),
    nextInvoiceDate: date('next_invoice_date'),
    paymentTermId: uuid('payment_term_id')
      .notNull()
      .references(() => paymentTerms.id, { onDelete: 'restrict' }),
    quotationValidUntil: date('quotation_valid_until'),
    renewedFromId: uuid('renewed_from_id').references((): AnyPgColumn => subscriptions.id, {
      onDelete: 'set null',
    }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('subscriptions_status_idx').on(t.status),
    index('subscriptions_next_invoice_date_idx')
      .on(t.nextInvoiceDate)
      .where(sql`${t.status} = 'active'`),
    index('subscriptions_customer_id_idx').on(t.customerId),
    check('subscriptions_dates_check', sql`${t.expiryDate} >= ${t.startDate}`),
  ],
).enableRLS()

export const subscriptionLines = pgTable(
  'subscription_lines',
  {
    id: id(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    /** Null on the plan's base fee line. */
    productId: uuid('product_id').references(() => products.id, { onDelete: 'restrict' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'restrict' }),
    description: text('description').notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: money('unit_price').notNull(),
    taxRatePercent: percent('tax_rate_percent').notNull(),
    amount: money('amount').notNull(),
  },
  (t) => [
    index('subscription_lines_subscription_id_idx').on(t.subscriptionId),
    check('subscription_lines_quantity_check', sql`${t.quantity} > 0`),
    check('subscription_lines_unit_price_check', sql`${t.unitPrice} >= 0`),
    check('subscription_lines_tax_check', sql`${t.taxRatePercent} >= 0`),
    check('subscription_lines_amount_check', sql`${t.amount} >= 0`),
  ],
).enableRLS()

export const invoices = pgTable(
  'invoices',
  {
    id: id(),
    number: text('number')
      .notNull()
      .unique()
      .default(sql`'INV-' || lpad(nextval('invoice_number_seq')::text, 5, '0')`),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    /** Customer details as billed, so later profile edits do not rewrite old invoices. */
    customerSnapshot: jsonb('customer_snapshot'),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    status: invoiceStatus('status').notNull().default('draft'),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    subtotal: money('subtotal').notNull().default(0),
    discountTotal: money('discount_total').notNull().default(0),
    taxTotal: money('tax_total').notNull().default(0),
    total: money('total').notNull().default(0),
    amountPaid: money('amount_paid').notNull().default(0),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    // The billing idempotency guarantee: one live invoice per subscription period.
    uniqueIndex('invoices_subscription_period_idx')
      .on(t.subscriptionId, t.periodStart)
      .where(sql`${t.status} <> 'cancelled'`),
    index('invoices_status_due_date_idx').on(t.status, t.dueDate),
    index('invoices_customer_id_idx').on(t.customerId),
    check('invoices_period_check', sql`${t.periodEnd} >= ${t.periodStart}`),
    check('invoices_due_date_check', sql`${t.dueDate} >= ${t.issueDate}`),
    check('invoices_subtotal_check', sql`${t.subtotal} >= 0`),
    check('invoices_discount_total_check', sql`${t.discountTotal} >= 0`),
    check('invoices_tax_total_check', sql`${t.taxTotal} >= 0`),
    check('invoices_total_check', sql`${t.total} >= 0`),
    check(
      'invoices_amount_paid_check',
      sql`${t.amountPaid} >= 0 AND ${t.amountPaid} <= ${t.total}`,
    ),
  ],
).enableRLS()

// amount and unit_price have no non-negative check: discount lines are negative.
export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: id(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull(),
    unitPrice: money('unit_price').notNull(),
    taxRatePercent: percent('tax_rate_percent').notNull(),
    taxAmount: money('tax_amount').notNull(),
    amount: money('amount').notNull(),
  },
  (t) => [
    index('invoice_lines_invoice_id_idx').on(t.invoiceId),
    check('invoice_lines_quantity_check', sql`${t.quantity} > 0`),
  ],
).enableRLS()

export const discountRedemptions = pgTable(
  'discount_redemptions',
  {
    id: id(),
    discountId: uuid('discount_id')
      .notNull()
      .references(() => discounts.id, { onDelete: 'restrict' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('discount_redemptions_unique_idx').on(t.discountId, t.invoiceId)],
).enableRLS()

export const payments = pgTable(
  'payments',
  {
    id: id(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    method: paymentMethod('method').notNull(),
    amount: money('amount').notNull(),
    paidOn: date('paid_on').notNull(),
    note: text('note'),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('payments_invoice_id_idx').on(t.invoiceId),
    index('payments_paid_on_idx').on(t.paidOn),
    check('payments_amount_check', sql`${t.amount} > 0`),
  ],
).enableRLS()

export const billingRuns = pgTable(
  'billing_runs',
  {
    id: id(),
    runAt: timestamp('run_at', { withTimezone: true }).notNull().default(sql`now()`),
    asOfDate: date('as_of_date').notNull(),
    /** Null when the scheduled job started the run. */
    triggeredBy: uuid('triggered_by').references(() => users.id, { onDelete: 'set null' }),
    createdCount: integer('created_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    details: jsonb('details'),
  },
  (t) => [
    check('billing_runs_created_check', sql`${t.createdCount} >= 0`),
    check('billing_runs_skipped_check', sql`${t.skippedCount} >= 0`),
    check('billing_runs_error_check', sql`${t.errorCount} >= 0`),
  ],
).enableRLS()
