import { createServerFn } from '@tanstack/react-start'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { db } from '~/db/client'
import { isUniqueViolation } from '~/db/errors'
import { customers, passwordResetTokens, sessions, users } from '~/db/schema'
import { clock } from '~/server/clock'
import { env } from '~/server/env'
import { sendMail } from '~/server/mail'
import { hashPassword, verifyPassword } from '~/server/passwords'
import { ensureBillingScheduler } from '~/server/scheduler'
import {
  createSession,
  destroySession,
  generateToken,
  getSessionUser,
  hashToken,
  type Role,
} from '~/server/session'
import type { ActionResult } from '~/shared/result'
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from '~/shared/schemas/auth'

const RESET_TOKEN_MS = 60 * 60 * 1000

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(() => {
  // Every page asks who is signed in, so this is where the daily billing job gets started.
  ensureBillingScheduler()
  return getSessionUser()
})

export const signup = createServerFn({ method: 'POST' })
  .validator(signupSchema)
  .handler(async ({ data }): Promise<ActionResult<{ role: Role }>> => {
    const passwordHash = await hashPassword(data.password)
    try {
      const userId = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({ email: data.email, name: data.name, passwordHash, role: 'customer' })
          .returning({ id: users.id })
        await tx.insert(customers).values({ userId: user.id, name: data.name, email: data.email })
        return user.id
      })
      await createSession(userId)
      return { ok: true, data: { role: 'customer' } }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, fieldErrors: { email: 'An account with this email already exists' } }
      }
      throw error
    }
  })

export const login = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<ActionResult<{ role: Role }>> => {
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${data.email}`)

    const matches = await verifyPassword(data.password, user?.passwordHash)
    if (!user || !matches) return { ok: false, error: 'Email or password is incorrect' }

    await createSession(user.id)
    return { ok: true, data: { role: user.role } }
  })

export const logout = createServerFn({ method: 'POST' }).handler(() => destroySession())

export const forgotPassword = createServerFn({ method: 'POST' })
  .validator(forgotPasswordSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(sql`lower(${users.email}) = ${data.email}`)

    if (user) {
      const token = generateToken()
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(clock.now().getTime() + RESET_TOKEN_MS),
      })
      // A mail failure must look the same to the caller as an unknown email.
      await sendMail({
        to: user.email,
        subject: 'Reset your Brightloop password',
        text: `Open this link to choose a new password. It works once and expires in 1 hour.\n\n${env.APP_URL}/reset-password?token=${token}\n\nIf you did not ask for this, you can ignore this email.`,
      }).catch((error) => console.error('Password reset email failed', error))
    }
    return { ok: true, data: undefined }
  })

export const resetPassword = createServerFn({ method: 'POST' })
  .validator(resetPasswordSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const passwordHash = await hashPassword(data.password)
    return db.transaction(async (tx) => {
      // The conditional UPDATE makes the token single-use even under concurrent requests.
      const [claimed] = await tx
        .update(passwordResetTokens)
        .set({ usedAt: clock.now() })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, hashToken(data.token)),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, clock.now()),
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
  })
