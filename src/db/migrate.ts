import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createClient } from './client'

const client = createClient(1)

await migrate(drizzle(client), { migrationsFolder: './drizzle' })
await client.end()

console.log('Migrations applied.')
