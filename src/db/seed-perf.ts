import { createDb } from './client'

// Adds about 5,000 subscriptions and 30,000 invoices with plain SQL, to check the dashboard stays
// fast. Run `pnpm db:setup` first: it borrows the demo plans, payment terms and admin user.
// Every row it adds belongs to a customer whose email ends in @perf.example, so `--clean` removes it.

const db = createDb(1)
const sql = db.$client

const [{ name }] = await sql<{ name: string }[]>`select current_database() as name`
const safe = name.endsWith('_test') || name.endsWith('_perf') || process.env.ALLOW_PERF_SEED === '1'
if (!safe) {
  console.error(
    `Refusing to add thousands of rows to "${name}". Use a database ending in _test or _perf, ` +
      'or set ALLOW_PERF_SEED=1 if you really mean it.',
  )
  await sql.end()
  process.exit(1)
}

if (process.argv.includes('--clean')) {
  await sql`delete from payments where invoice_id in (select i.id from invoices i join customers c on c.id = i.customer_id where c.email like '%@perf.example')`
  await sql`delete from invoices where customer_id in (select id from customers where email like '%@perf.example')`
  await sql`delete from subscriptions where customer_id in (select id from customers where email like '%@perf.example')`
  await sql`delete from customers where email like '%@perf.example'`
  console.log('Removed the performance data.')
  await sql.end()
  process.exit(0)
}

const [{ n: already }] = await sql<
  { n: number }[]
>`select count(*)::int as n from customers where email like '%@perf.example'`
if (already > 0) {
  console.log('Performance data is already there. Run with --clean to remove it first.')
  await sql.end()
  process.exit(0)
}

const [base] = await sql<{ plans: number; terms: number; admins: number }[]>`
  select (select count(*) from plans)::int as plans,
         (select count(*) from payment_terms)::int as terms,
         (select count(*) from users where role = 'admin')::int as admins`
if (base.plans === 0 || base.terms === 0 || base.admins === 0) {
  console.error('The database has no plans, payment terms or admin. Run `pnpm db:setup` first.')
  await sql.end()
  process.exit(1)
}

const started = Date.now()

await sql`
  insert into customers (name, email)
  select 'Perf Customer ' || g, 'customer' || g || '@perf.example'
  from generate_series(1, 500) g`

// 5,000 subscriptions spread over the customers, plans and terms, in every status.
await sql`
  with c as (select id, row_number() over (order by email) as rn from customers where email like '%@perf.example'),
       p as (select id, row_number() over (order by id) as rn, (select count(*) from plans) as total from plans),
       t as (select id, row_number() over (order by id) as rn, (select count(*) from payment_terms) as total from payment_terms)
  insert into subscriptions (customer_id, plan_id, payment_term_id, status, start_date, expiry_date, next_invoice_date)
  select c.id, p.id, t.id,
         (array['active','active','active','active','active','active','paused','closed','confirmed','draft'])[1 + g % 10]::subscription_status,
         current_date - (30 + g % 600),
         case when g % 4 = 0 then current_date + (g % 300) end,
         case when g % 10 < 6 then current_date + (g % 28) end
  from generate_series(1, 5000) g
  join c on c.rn = 1 + g % 500
  join p on p.rn = 1 + g % p.total
  join t on t.rn = 1 + g % t.total`

await sql`
  insert into subscription_lines (subscription_id, description, quantity, unit_price, tax_rate_percent, amount)
  select s.id, pl.name, 1, pl.price, 18, pl.price
  from subscriptions s
  join plans pl on pl.id = s.plan_id
  join customers c on c.id = s.customer_id and c.email like '%@perf.example'`

// About 30,000 invoices: 3 to 12 monthly periods for each subscription that has started billing.
await sql`
  with s as (
    select s.id, s.customer_id, s.start_date, row_number() over (order by s.number) as g, t.days_due
    from subscriptions s
    join payment_terms t on t.id = s.payment_term_id
    join customers c on c.id = s.customer_id and c.email like '%@perf.example'
    where s.status in ('active', 'paused', 'closed')
  )
  insert into invoices (subscription_id, customer_id, period_start, period_end, status, issue_date, due_date,
                        subtotal, discount_total, tax_total, total, amount_paid)
  select s.id, s.customer_id,
         (s.start_date + make_interval(months => k))::date,
         (s.start_date + make_interval(months => k + 1))::date - 1,
         x.status::invoice_status,
         (s.start_date + make_interval(months => k))::date,
         (s.start_date + make_interval(months => k))::date + s.days_due,
         x.subtotal, 0, x.tax, x.subtotal + x.tax,
         case when x.status = 'paid' then x.subtotal + x.tax
              when x.status = 'confirmed' and (s.g + k) % 3 = 0 then (x.subtotal + x.tax) / 2
              else 0 end
  from s
  cross join lateral generate_series(0, 2 + (s.g % 10)::int) as k
  cross join lateral (
    select (array['draft','confirmed','confirmed','paid','paid','paid'])[1 + ((s.g + k) % 6)::int] as status,
           (10000 * (1 + (s.g % 9)))::bigint as subtotal,
           (1800 * (1 + (s.g % 9)))::bigint as tax
  ) x`

await sql`
  insert into payments (invoice_id, method, amount, paid_on, recorded_by)
  select i.id,
         (array['cash','bank_transfer','card','upi','cheque'])[1 + (row_number() over (order by i.number) % 5)::int]::payment_method,
         i.amount_paid,
         least(i.issue_date + 3, current_date),
         (select id from users where role = 'admin' order by email limit 1)
  from invoices i
  join customers c on c.id = i.customer_id and c.email like '%@perf.example'
  where i.amount_paid > 0`

await sql`analyze`

const [counts] = await sql<{ subscriptions: number; invoices: number; payments: number }[]>`
  select (select count(*) from subscriptions)::int as subscriptions,
         (select count(*) from invoices)::int as invoices,
         (select count(*) from payments)::int as payments`
console.log(`Added performance data in ${((Date.now() - started) / 1000).toFixed(1)}s.`)
console.log(
  `The database now has ${counts.subscriptions} subscriptions, ${counts.invoices} invoices and ${counts.payments} payments.`,
)
await sql.end()
