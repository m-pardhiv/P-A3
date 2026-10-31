export type Limit = { max: number; windowMs: number }

/**
 * Counts events per key inside a sliding window. It has no clock of its own: callers pass `now`,
 * so it stays a pure, testable piece of logic. State lives in the map the caller keeps.
 */
export type Hits = Map<string, number[]>

const MAX_KEYS = 10_000

function recent(hits: Hits, key: string, limit: Limit, now: number) {
  const fresh = (hits.get(key) ?? []).filter((at) => now - at < limit.windowMs)
  if (fresh.length === 0) hits.delete(key)
  else hits.set(key, fresh)
  return fresh
}

export function check(hits: Hits, key: string, limit: Limit, now: number) {
  const fresh = recent(hits, key, limit, now)
  if (fresh.length < limit.max) return { allowed: true as const }
  return { allowed: false as const, retryAfterMs: fresh[0] + limit.windowMs - now }
}

export function record(hits: Hits, key: string, limit: Limit, now: number) {
  // A flood of distinct keys cannot grow memory without bound.
  if (hits.size >= MAX_KEYS && !hits.has(key)) {
    for (const stale of hits.keys()) recent(hits, stale, limit, now)
    if (hits.size >= MAX_KEYS) hits.clear()
  }
  hits.set(key, [...recent(hits, key, limit, now), now])
}

export const forget = (hits: Hits, key: string) => hits.delete(key)

export const minutesText = (ms: number) => {
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}
