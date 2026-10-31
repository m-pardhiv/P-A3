import { createServerFn } from '@tanstack/react-start'
import { db } from '~/db/client'
import {
  authenticate,
  completePasswordReset,
  registerCustomer,
  startPasswordReset,
} from '~/server/auth-core'
import { env } from '~/server/env'
import { log } from '~/server/log'
import { sendMail } from '~/server/mail'
import { blocked, clear, clientIp, hit, LIMITS } from '~/server/rate-limit'
import { ensureBillingScheduler } from '~/server/scheduler'
import { createSession, destroySession, getSessionUser, type Role } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from '~/shared/schemas/auth'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(() => {
  // Every page asks who is signed in, so this is where the daily billing job gets started.
  ensureBillingScheduler()
  return getSessionUser()
})

export const signup = createServerFn({ method: 'POST' })
  .validator(signupSchema)
  .handler(async ({ data }): Promise<ActionResult<{ role: Role }>> => {
    const guards = [{ key: `signup:ip:${clientIp()}`, limit: LIMITS.signupPerIp }]
    const refused = blocked(guards)
    if (refused) return refused
    hit(guards)

    const result = await registerCustomer(db, data)
    if (!result.ok) return result
    await createSession(result.data.userId)
    return { ok: true, data: { role: 'customer' } }
  })

export const login = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<ActionResult<{ role: Role }>> => {
    const emailKey = `login:email:${data.email}`
    const guards = [
      { key: emailKey, limit: LIMITS.loginPerEmail },
      { key: `login:ip:${clientIp()}`, limit: LIMITS.loginPerIp },
    ]
    const refused = blocked(guards)
    if (refused) return refused

    const result = await authenticate(db, data)
    if (!result.ok) {
      // Only failures count, so a customer who types it right is never locked out by their own history.
      hit(guards)
      return result
    }
    clear(emailKey)
    await createSession(result.data.userId)
    return { ok: true, data: { role: result.data.role } }
  })

export const logout = createServerFn({ method: 'POST' }).handler(() => destroySession())

export const forgotPassword = createServerFn({ method: 'POST' })
  .validator(forgotPasswordSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    const guards = [
      { key: `reset:email:${data.email}`, limit: LIMITS.resetPerEmail },
      { key: `reset:ip:${clientIp()}`, limit: LIMITS.resetPerIp },
    ]
    const refused = blocked(guards)
    if (refused) return refused
    // Known and unknown emails count the same, so the limit reveals nothing.
    hit(guards)

    const reset = await startPasswordReset(db, data.email)
    if (reset) {
      // A mail failure must look the same to the caller as an unknown email.
      await sendMail({
        to: reset.email,
        subject: 'Reset your Brightloop password',
        text: `Open this link to choose a new password. It works once and expires in 1 hour.\n\n${env.APP_URL}/reset-password?token=${reset.token}\n\nIf you did not ask for this, you can ignore this email.`,
      }).catch((error) => log.error('password_reset_email_failed', error))
    }
    return { ok: true, data: undefined }
  })

export const resetPassword = createServerFn({ method: 'POST' })
  .validator(resetPasswordSchema)
  .handler(async ({ data }): Promise<ActionResult> => completePasswordReset(db, data))
