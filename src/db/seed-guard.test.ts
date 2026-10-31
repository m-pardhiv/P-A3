import { describe, expect, it } from 'vitest'
import { seedBlocker } from './seed-guard'

const local = 'postgresql://brightloop:x@127.0.0.1:5432/brightloop'
const remote = 'postgresql://u:x@db.example.com:5432/app'

describe('seed guard', () => {
  it('lets a local database seed and reset', () => {
    expect(seedBlocker({ databaseUrl: local, reset: false })).toBeNull()
    expect(seedBlocker({ databaseUrl: local, reset: true })).toBeNull()
  })

  it('never resets in production, even on a local host', () => {
    expect(
      seedBlocker({ nodeEnv: 'production', databaseUrl: local, reset: true, allowReset: true }),
    ).toMatch(/production/)
  })

  it('refuses to reset a remote database unless told to', () => {
    expect(seedBlocker({ databaseUrl: remote, reset: true })).toMatch(/not on this machine/)
    expect(
      seedBlocker({ databaseUrl: remote, reset: true, allowReset: true, allowDemoSeed: true }),
    ).toBeNull()
  })

  it('keeps the public demo password out of production and remote databases', () => {
    expect(seedBlocker({ nodeEnv: 'production', databaseUrl: local, reset: false })).toMatch(
      /public password/,
    )
    expect(seedBlocker({ databaseUrl: remote, reset: false })).toMatch(/public password/)
    expect(seedBlocker({ databaseUrl: remote, reset: false, allowDemoSeed: true })).toBeNull()
  })

  it('treats an unreadable URL as not local', () => {
    expect(seedBlocker({ databaseUrl: 'not a url', reset: true })).toMatch(/not on this machine/)
  })
})
