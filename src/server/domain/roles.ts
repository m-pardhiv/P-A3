export type Role = 'admin' | 'staff' | 'customer'

/** The one rule behind requireRole: a signed-in user may act only if their role is listed. */
export const roleAllowed = (role: Role, allowed: readonly Role[]) => allowed.includes(role)
