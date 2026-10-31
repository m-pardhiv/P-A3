import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { customers, passwordResetTokens, sessions, users } from '~/db/schema'
import { assertTestDatabase, openTestDb, resetDb } from '~/test/helpers'
import {
  authenticate,
  completePasswordReset,
  createSessionToken,
  findSessionUser,
  hashToken,
  registerCustomer,
  revokeSessionToken,
  SESSION_DAYS,
  startPasswordReset,
} from './auth-core'

const { database, close } = openTestDb()
const PASSWORD = 'Brightl0op!'
const DAY = 24 * 60 * 60 * 1000
const at = (iso: string) => new Date(iso)

beforeAll(() => assertTestDatabase(database))
afterAll(close)
beforeEach(() => resetDb(database))

async function register(email = 'new@test.example') {
  const result = await registerCustomer(database, { name: 'New Person', email, password: PASSWORD })
  if (!result.ok) throw new Error('registration failed')
  return result.data.userId
}

describe('registration', () => {
  it('creates a customer user with a linked customer record', async () => {
    const userId = await register()

    const [user] = await database.select().from(users).where(eq(users.id, userId))
    expect(user.role).toBe('customer')
    const [customer] = await database.select().from(customers).where(eq(customers.userId, userId))
    expect(customer).toMatchObject({ name: 'New Person', email: 'new@test.example' })
  })

  it('stores a bcrypt hash, never the password', async () => {
    const userId = await register()
    const [user] = await database.select().from(users).where(eq(users.id, userId))

    expect(user.passwordHash).not.toContain(PASSWORD)
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/)
    expect(await bcrypt.compare(PASSWORD, user.passwordHash)).toBe(true)
  })

  it('refuses a second account for the same email, whatever the case', async () => {
    await register('same@test.example')
    const again = await registerCustomer(database, {
      name: 'Other',
      email: 'SAME@Test.Example',
      password: PASSWORD,
    })

    expect(again).toMatchObject({ ok: false, fieldErrors: { email: expect.any(String) } })
    expect(await database.select().from(users)).toHaveLength(1)
    expect(await database.select().from(customers)).toHaveLength(1)
  })
})

describe('login', () => {
  it('accepts the right password, in any case of the email', async () => {
    const userId = await register('mixed@test.example')
    const result = await authenticate(database, { email: 'MIXED@test.example', password: PASSWORD })

    expect(result).toEqual({ ok: true, data: { userId, role: 'customer' } })
  })

  it('gives the same message for a wrong password and an unknown email', async () => {
    await register('known@test.example')
    const wrong = await authenticate(database, {
      email: 'known@test.example',
      password: 'Wrong#Pass1',
    })
    const unknown = await authenticate(database, {
      email: 'nobody@test.example',
      password: PASSWORD,
    })

    expect(wrong).toEqual({ ok: false, error: 'Email or password is incorrect' })
    expect(unknown).toEqual(wrong)
  })
})

describe('sessions', () => {
  it('stores only the hash of the token', async () => {
    const userId = await register()
    const token = await createSessionToken(database, userId)

    const rows = await database.select().from(sessions)
    expect(rows).toHaveLength(1)
    expect(rows[0].tokenHash).toBe(hashToken(token))
    expect(rows[0].tokenHash).not.toBe(token)
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('finds the user for a valid token and nobody for an unknown one', async () => {
    const userId = await register()
    const token = await createSessionToken(database, userId)

    expect(await findSessionUser(database, token)).toMatchObject({ id: userId, role: 'customer' })
    expect(await findSessionUser(database, 'not-a-real-token')).toBeNull()
  })

  it('lasts 7 days and not a moment longer', async () => {
    expect(SESSION_DAYS).toBe(7)
    const userId = await register()
    const created = at('2026-03-01T10:00:00Z')
    const token = await createSessionToken(database, userId, created)

    const justBefore = new Date(created.getTime() + 7 * DAY - 1000)
    const justAfter = new Date(created.getTime() + 7 * DAY + 1000)
    expect(await findSessionUser(database, token, justBefore)).not.toBeNull()
    expect(await findSessionUser(database, token, justAfter)).toBeNull()
  })

  it('logging out ends only that session', async () => {
    const userId = await register()
    const first = await createSessionToken(database, userId)
    const second = await createSessionToken(database, userId)

    await revokeSessionToken(database, first)

    expect(await findSessionUser(database, first)).toBeNull()
    expect(await findSessionUser(database, second)).not.toBeNull()
  })
})

describe('password reset', () => {
  it('returns nothing for an unknown email, so the caller can answer identically', async () => {
    expect(await startPasswordReset(database, 'nobody@test.example')).toBeNull()
    expect(await database.select().from(passwordResetTokens)).toHaveLength(0)
  })

  it('stores only a hash of the token, and expires it after one hour', async () => {
    await register('reset@test.example')
    const start = at('2026-03-01T10:00:00Z')
    const reset = await startPasswordReset(database, 'reset@test.example', start)
    if (!reset) throw new Error('expected a token')

    const [row] = await database.select().from(passwordResetTokens)
    expect(row.tokenHash).toBe(hashToken(reset.token))
    expect(row.tokenHash).not.toBe(reset.token)
    expect(row.expiresAt.getTime() - start.getTime()).toBe(60 * 60 * 1000)
  })

  it('sets the new password, works once, and signs the user out everywhere', async () => {
    const userId = await register('reset@test.example')
    const token = await createSessionToken(database, userId)
    const reset = await startPasswordReset(database, 'reset@test.example')
    if (!reset) throw new Error('expected a token')

    const done = await completePasswordReset(database, {
      token: reset.token,
      password: 'Fresh#Pass9',
    })
    expect(done.ok).toBe(true)

    expect(await findSessionUser(database, token)).toBeNull()
    expect(
      (await authenticate(database, { email: 'reset@test.example', password: 'Fresh#Pass9' })).ok,
    ).toBe(true)
    expect(
      (await authenticate(database, { email: 'reset@test.example', password: PASSWORD })).ok,
    ).toBe(false)

    const again = await completePasswordReset(database, {
      token: reset.token,
      password: 'Other#Pass9',
    })
    expect(again.ok).toBe(false)
  })

  it('refuses a link older than an hour', async () => {
    await register('late@test.example')
    const start = at('2026-03-01T10:00:00Z')
    const reset = await startPasswordReset(database, 'late@test.example', start)
    if (!reset) throw new Error('expected a token')

    const late = new Date(start.getTime() + 60 * 60 * 1000 + 1000)
    const result = await completePasswordReset(
      database,
      { token: reset.token, password: 'Fresh#Pass9' },
      late,
    )
    expect(result.ok).toBe(false)
    expect(
      (await authenticate(database, { email: 'late@test.example', password: PASSWORD })).ok,
    ).toBe(true)
  })

  it('lets only one of two simultaneous uses of a link succeed', async () => {
    await register('race@test.example')
    const reset = await startPasswordReset(database, 'race@test.example')
    if (!reset) throw new Error('expected a token')

    const results = await Promise.all([
      completePasswordReset(database, { token: reset.token, password: 'First#Pass9' }),
      completePasswordReset(database, { token: reset.token, password: 'Second#Pass9' }),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
  })
})
