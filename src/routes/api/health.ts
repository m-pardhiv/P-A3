import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { db } from '~/db/client'
import { log } from '~/server/log'

// For uptime monitors and load balancers: 200 when the app can reach its database, 503 when not.
// It reveals nothing about the system beyond that.
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`select 1`)
          return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
        } catch (error) {
          log.error('health_check_failed', error)
          return Response.json(
            { status: 'unavailable' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
          )
        }
      },
    },
  },
})
