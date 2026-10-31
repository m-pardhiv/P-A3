import { createServerFn } from '@tanstack/react-start'
import { asc, count, inArray } from 'drizzle-orm'
import { db } from '~/db/client'
import { isUniqueViolation } from '~/db/errors'
import { users } from '~/db/schema'
import { hashPassword } from '~/server/passwords'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { createStaffSchema } from '~/shared/schemas/auth'
import { PAGE_SIZE, paginationSchema } from '~/shared/schemas/pagination'

const teamRoles = inArray(users.role, ['admin', 'staff'])

export const listStaff = createServerFn({ method: 'GET' })
  .validator(paginationSchema)
  .handler(async ({ data }) => {
    await requireRole('admin')
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(teamRoles)
        .orderBy(asc(users.role), asc(users.name))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(users).where(teamRoles),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })

export const createStaff = createServerFn({ method: 'POST' })
  .validator(createStaffSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin')
    const passwordHash = await hashPassword(data.password)
    try {
      await db.insert(users).values({
        email: data.email,
        name: data.name,
        passwordHash,
        role: 'staff',
      })
      return { ok: true, data: undefined }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, fieldErrors: { email: 'An account with this email already exists' } }
      }
      throw error
    }
  })
