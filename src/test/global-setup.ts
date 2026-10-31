import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { testDatabaseUrl } from './db-url'

/** Brings the test database up to date once per run, and refuses to touch any other database. */
export default async function setup() {
  config({ quiet: true })
  const url = testDatabaseUrl()
  const name = new URL(url).pathname.slice(1)
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${name}". The database name must end in _test.`)
  }

  const database = drizzle({ connection: { url, max: 1, onnotice: () => {} } })
  try {
    await migrate(database, { migrationsFolder: './drizzle' })
  } catch (error) {
    const reason =
      error instanceof Error
        ? ((error.cause as Error | undefined)?.message ?? error.message)
        : error
    throw new Error(
      `Cannot use the test database "${name}". Create it with: ` +
        `psql -U postgres -c "create database ${name} owner brightloop". (${reason})`,
    )
  } finally {
    await database.$client.end()
  }
}
