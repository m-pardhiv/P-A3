import { describe, expect, it } from 'vitest'
import { check, forget, type Hits, minutesText, record } from './rate-limit'

const limit = { max: 3, windowMs: 60_000 }

describe('rate limit', () => {
  it('allows up to the limit, then blocks', () => {
    const hits: Hits = new Map()
    for (let i = 0; i < 3; i++) {
      expect(check(hits, 'a', limit, i).allowed).toBe(true)
      record(hits, 'a', limit, i)
    }
    expect(check(hits, 'a', limit, 10).allowed).toBe(false)
  })

  it('reports when the first hit leaves the window', () => {
    const hits: Hits = new Map()
    for (const at of [0, 1000, 2000]) record(hits, 'a', limit, at)
    const result = check(hits, 'a', limit, 5000)
    expect(result).toEqual({ allowed: false, retryAfterMs: 55_000 })
  })

  it('lets the key back in once the window has passed', () => {
    const hits: Hits = new Map()
    for (const at of [0, 1, 2]) record(hits, 'a', limit, at)
    expect(check(hits, 'a', limit, 60_001).allowed).toBe(true)
  })

  it('counts each key on its own', () => {
    const hits: Hits = new Map()
    for (const at of [0, 1, 2]) record(hits, 'a', limit, at)
    expect(check(hits, 'b', limit, 3).allowed).toBe(true)
  })

  it('forgets a key after a success', () => {
    const hits: Hits = new Map()
    for (const at of [0, 1, 2]) record(hits, 'a', limit, at)
    forget(hits, 'a')
    expect(check(hits, 'a', limit, 3).allowed).toBe(true)
  })

  it('rounds the wait up to whole minutes', () => {
    expect(minutesText(1)).toBe('1 minute')
    expect(minutesText(61_000)).toBe('2 minutes')
  })
})
