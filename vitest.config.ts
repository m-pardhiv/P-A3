import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so tests do not load the Start plugin.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ['src/**/*.test.ts'] },
})
