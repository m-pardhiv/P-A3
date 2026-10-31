import { PgDialect } from 'drizzle-orm/pg-core'
import {
  activeAndMrrSql,
  overdueCountQuery,
  overdueQuery,
  owedSql,
  paymentsCountQuery,
  paymentsQuery,
  resolveFilters,
  revenueSql,
  subscriptionsCountQuery,
  subscriptionsQuery,
} from '~/server/dashboard'
import { createDb } from './client'

// Runs EXPLAIN ANALYZE on the dashboard's own queries, so the plan reported is the plan used.
// Usage: pnpm db:explain [--full]   (--full prints every plan, not just the summary)

const db = createDb(1)
const sql = db.$client
const dialect = new PgDialect()
const filters = resolveFilters({ from: undefined, to: undefined })

const queries: [string, { sql: string; params: unknown[] }][] = [
  ['Active subscriptions and MRR', dialect.sqlToQuery(activeAndMrrSql(filters))],
  ['Revenue in the date range', dialect.sqlToQuery(revenueSql(filters))],
  ['Outstanding, overdue and ageing', dialect.sqlToQuery(owedSql(filters))],
  ['Recent payments, page 1', paymentsQuery(db, filters, 1).toSQL()],
  ['Recent payments, count', paymentsCountQuery(db, filters).toSQL()],
  ['Overdue invoices, page 1', overdueQuery(db, filters, 1).toSQL()],
  ['Overdue invoices, count', overdueCountQuery(db, filters).toSQL()],
  ['Subscriptions, page 1', subscriptionsQuery(db, filters, 1).toSQL()],
  ['Subscriptions, count', subscriptionsCountQuery(db, filters).toSQL()],
]

const [{ name }] = await sql<{ name: string }[]>`select current_database() as name`
const [size] = await sql<{ subscriptions: number; invoices: number; payments: number }[]>`
  select (select count(*) from subscriptions)::int as subscriptions,
         (select count(*) from invoices)::int as invoices,
         (select count(*) from payments)::int as payments`
console.log(
  `Database ${name}: ${size.subscriptions} subscriptions, ${size.invoices} invoices, ${size.payments} payments\n`,
)

const full = process.argv.includes('--full')
for (const [label, query] of queries) {
  // Run it once first so the timing is not the cold cache.
  await sql.unsafe(`explain (analyze) ${query.sql}`, query.params as never[])
  const plan = (
    await sql.unsafe(`explain (analyze, buffers) ${query.sql}`, query.params as never[])
  ).map((row) => String(row['QUERY PLAN']))
  const time = plan
    .find((line) => line.startsWith('Execution Time'))
    ?.replace('Execution Time: ', '')
  const scans = plan
    .map((line) =>
      line.match(/(Seq Scan|Index Only Scan|Index Scan|Bitmap Index Scan) (?:using |on )(\S+)/),
    )
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => `${match[1]} ${match[2]}`)

  console.log(`${label}\n  ${time}\n  ${[...new Set(scans)].join('\n  ')}\n`)
  if (full) console.log(plan.join('\n'), '\n')
}
await sql.end()
