import { deleteCookie, getCookie, setCookie, setResponseStatus } from '@tanstack/react-start/server'
import { db } from '~/db/client'
import {
  createSessionToken,
  findSessionUser,
  revokeSessionToken,
  SESSION_SECONDS,
  type SessionUser,
} from './auth-core'
import { type Role, roleAllowed } from './domain/roles'
import { env } from './env'

const COOKIE_NAME = 'brightloop_session'

export { generateToken, hashToken } from './auth-core'
export type { Role, SessionUser }

/** The cookie is HTTPS-only in production, or whenever the public URL is https. */
const secureCookie = () =>
  process.env.NODE_ENV === 'production' || env.APP_URL.startsWith('https://')

export async function createSession(userId: string) {
  const token = await createSessionToken(db, userId)
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie(),
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function destroySession() {
  const token = getCookie(COOKIE_NAME)
  if (token) await revokeSessionToken(db, token)
  deleteCookie(COOKIE_NAME, { path: '/' })
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE_NAME)
  return token ? findSessionUser(db, token) : null
}

/** Every server function calls this first. Hiding a menu item protects nothing. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    setResponseStatus(401)
    throw new Error('Sign in to continue')
  }
  if (!roleAllowed(user.role, roles)) {
    setResponseStatus(403)
    throw new Error('You do not have access to this')
  }
  return user
}
