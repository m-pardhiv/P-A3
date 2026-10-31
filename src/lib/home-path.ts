import type { Role } from '~/server/session'

/** Where each kind of user lands: a full destination, so every required search value is set. */
export const homeFor = (role: Role) =>
  role === 'customer'
    ? ({ to: '/portal/subscriptions', search: { page: 1 } } as const)
    : ({
        to: '/dashboard',
        search: { payPage: 1, overduePage: 1, subPage: 1, invoicePage: 1 },
      } as const)
