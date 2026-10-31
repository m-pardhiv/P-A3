import type { Role } from '~/server/session'

export const homePathFor = (role: Role) =>
  role === 'customer' ? '/portal/subscriptions' : '/dashboard'
