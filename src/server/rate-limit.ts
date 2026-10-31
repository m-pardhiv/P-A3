import { getRequestIP } from '@tanstack/react-start/server'
import type { ActionResult } from '~/shared/result'
import { clock } from './clock'
import { check, forget, type Hits, type Limit, minutesText, record } from './domain/rate-limit'
import { env } from './env'

// One map for the whole process, kept on globalThis so a dev-server reload does not reset it.
const store = globalThis as { __rateHits?: Hits }
const hits: Hits = (store.__rateHits ??= new Map())

const FIFTEEN_MINUTES = 15 * 60 * 1000

export const LIMITS = {
  loginPerEmail: { max: 5, windowMs: FIFTEEN_MINUTES },
  loginPerIp: { max: 30, windowMs: FIFTEEN_MINUTES },
  resetPerEmail: { max: 3, windowMs: FIFTEEN_MINUTES },
  resetPerIp: { max: 10, windowMs: FIFTEEN_MINUTES },
  signupPerIp: { max: 10, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, Limit>

/** Behind a proxy the real address is in X-Forwarded-For. It is only trusted when TRUST_PROXY=true. */
export function clientIp() {
  try {
    return getRequestIP({ xForwardedFor: env.TRUST_PROXY === 'true' }) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export type Guard = { key: string; limit: Limit }

/** Returns a refusal if any guard is full. Nothing is recorded until `fail` or `hit` is called. */
export function blocked(guards: Guard[]): ActionResult<never> | null {
  const now = clock.now().getTime()
  for (const { key, limit } of guards) {
    const result = check(hits, key, limit, now)
    if (!result.allowed) {
      return {
        ok: false,
        error: `Too many attempts. Try again in ${minutesText(result.retryAfterMs)}.`,
      }
    }
  }
  return null
}

export function hit(guards: Guard[]) {
  const now = clock.now().getTime()
  for (const { key, limit } of guards) record(hits, key, limit, now)
}

export const clear = (key: string) => forget(hits, key)
