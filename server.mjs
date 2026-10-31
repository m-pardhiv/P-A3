// Production entry point: `pnpm build`, then `pnpm start`. It serves the built app and its static
// files on one Node process, which also runs the daily billing job, so it must stay running.
import { serve } from 'srvx'
import { staticMiddleware } from 'srvx/static'
import app from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)
const server = serve({
  port,
  hostname: process.env.HOST ?? '0.0.0.0',
  middleware: [staticMiddleware({ dir: './dist/client' })],
  fetch: app.fetch,
})
await server.ready()

// The billing job starts on the first page request. Make that request now, so it runs from boot
// and not only after the first visitor.
await fetch(`http://127.0.0.1:${port}/login`).catch(() => {})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.close()
    process.exit(0)
  })
}
