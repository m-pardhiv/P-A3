import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'
import { testDatabaseUrl } from './src/test/db-url.ts'

config({ quiet: true })

// Separate from vite.config.ts so tests do not load the Start plugin.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
    // Anything that reaches the app's database module gets the test database instead.
    env: { DATABASE_URL: process.env.DATABASE_URL ? testDatabaseUrl() : '' },
    // The database tests share one database, so test files run one after another.
    fileParallelism: false,
  },
})
