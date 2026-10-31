import { createHash, randomBytes } from 'node:crypto'
import { deleteCookie, getCookie, setCookie, setResponseStatus } from '@tanstack/react-start/server'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '~/db/client'
import { sessions, users } from '~/db/schema'
import { clock } from './clock'

const COOKIE_NAME = 'brightloop_session'
const SESSION_DAYS = 7
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60

export type Role = 'admin' | 'staff' | 'customer'
export type SessionUser = { id: string; email: string; name: string; role: Role }

export const generateToken = () => randomBytes(32).toString('hex')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createSession(userId: string) {
  const token = generateToken()
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(clock.now().getTime() + SESSION_SECONDS * 1000),
  })
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function destroySession() {
  const token = getCookie(COOKIE_NAME)
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  deleteCookie(COOKIE_NAME, { path: '/' })
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE_NAME)
  if (!token) return null

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, clock.now())))
  return user ?? null
}

/** Every server function calls this first. Hiding a menu item protects nothing. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    setResponseStatus(401)
    throw new Error('Sign in to continue')
  }
  if (!roles.includes(user.role)) {
    setResponseStatus(403)
    throw new Error('You do not have access to this')
  }
  return user
}
