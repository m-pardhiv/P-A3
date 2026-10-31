import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '~/server/env'
import * as schema from './schema'

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL)

// Drizzle opens the connection itself, so its types and the driver's types always agree.
export function createDb(max: number) {
  return drizzle({
    connection: {
      url: env.DATABASE_URL,
      max,
      // Local Postgres does not offer TLS; any other host must use it.
      ssl: isLocal ? false : 'require',
      onnotice: () => {},
    },
    schema,
  })
}

export type Database = ReturnType<typeof createDb>
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
/** Either the database or a transaction on it. */
export type Executor = Database | Tx

export const db = createDb(10)
