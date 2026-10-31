import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import type { Database } from '~/db/client'
import { isUniqueViolation } from '~/db/errors'
import { customers, passwordResetTokens, sessions, users } from '~/db/schema'
import type { ActionResult } from '~/shared/result'
import { clock } from './clock'
import type { Role } from './domain/roles'
import { hashPassword, verifyPassword } from './passwords'

export const SESSION_DAYS = 7
export const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60
export const RESET_TOKEN_MS = 60 * 60 * 1000

export type SessionUser = { id: string; email: string; name: string; role: Role }

export const generateToken = () => randomBytes(32).toString('hex')
/** Only the hash of a session or reset token is stored, so a leaked table cannot be replayed. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Creates a customer user and the linked customer record together. */
export async function registerCustomer(
  database: Database,
  input: { name: string; email: string; password: string },
): Promise<ActionResult<{ userId: string }>> {
  const passwordHash = await hashPassword(input.password)
  try {
    const userId = await database.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email: input.email, name: input.name, passwordHash, role: 'customer' })
        .returning({ id: users.id })
      await tx.insert(customers).values({ userId: user.id, name: input.name, email: input.email })
      return user.id
    })
    return { ok: true, data: { userId } }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { email: 'An account with this email already exists' } }
    }
    throw error
  }
}

/** Checks an email and password. A wrong email takes as long as a wrong password. */
export async function authenticate(
  database: Database,
  input: { email: string; password: string },
): Promise<ActionResult<{ userId: string; role: Role }>> {
  const [user] = await database
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${input.email.toLowerCase()}`)
  const matches = await verifyPassword(input.password, user?.passwordHash)
  if (!user || !matches) return { ok: false, error: 'Email or password is incorrect' }
  return { ok: true, data: { userId: user.id, role: user.role } }
}

/** Stores a new session and returns the token to put in the cookie. */
export async function createSessionToken(database: Database, userId: string, now = clock.now()) {
  const token = generateToken()
  await database.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + SESSION_SECONDS * 1000),
  })
  return token
}

export async function findSessionUser(
  database: Database,
  token: string,
  now = clock.now(),
): Promise<SessionUser | null> {
  const [user] = await database
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)))
  return user ?? null
}

export async function revokeSessionToken(database: Database, token: string) {
  await database.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
}

/** Returns the raw token for the email link, or null when no such account exists. */
export async function startPasswordReset(database: Database, email: string, now = clock.now()) {
  const [user] = await database
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
  if (!user) return null
  const token = generateToken()
  await database.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + RESET_TOKEN_MS),
  })
  return { token, email: user.email }
}

export async function completePasswordReset(
  database: Database,
  input: { token: string; password: string },
  now = clock.now(),
): Promise<ActionResult> {
  const passwordHash = await hashPassword(input.password)
  return database.transaction(async (tx): Promise<ActionResult> => {
    // The conditional UPDATE makes the token single-use even under concurrent requests.
    const [claimed] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(input.token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId })
    if (!claimed) {
      return { ok: false, error: 'This link has expired or was already used. Request a new one.' }
    }
    await tx.update(users).set({ passwordHash }).where(eq(users.id, claimed.userId))
    // Anyone signed in with the old password is signed out.
    await tx.delete(sessions).where(eq(sessions.userId, claimed.userId))
    return { ok: true, data: undefined }
  })
}
