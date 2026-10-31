import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '~/server/env'
import * as schema from './schema'

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL)

export function createClient(max: number) {
  return postgres(env.DATABASE_URL, {
    max,
    // Supabase's transaction pooler cannot use prepared statements.
    prepare: false,
    ssl: isLocal ? false : 'require',
    onnotice: () => {},
  })
}

export const db = drizzle(createClient(10), { schema })
