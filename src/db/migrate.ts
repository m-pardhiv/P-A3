import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDb } from './client'

const database = createDb(1)

await migrate(database, { migrationsFolder: './drizzle' })
await database.$client.end()

console.log('Migrations applied.')
