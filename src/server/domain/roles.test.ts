import { describe, expect, it } from 'vitest'
import { roleAllowed } from './roles'

describe('role-based access', () => {
  it('lets a role through only when it is listed', () => {
    expect(roleAllowed('admin', ['admin'])).toBe(true)
    expect(roleAllowed('staff', ['admin', 'staff'])).toBe(true)
    expect(roleAllowed('customer', ['customer'])).toBe(true)
  })

  it('keeps staff and customers out of admin-only operations', () => {
    expect(roleAllowed('staff', ['admin'])).toBe(false)
    expect(roleAllowed('customer', ['admin'])).toBe(false)
  })

  it('keeps customers out of staff operations, and staff out of the customer portal', () => {
    expect(roleAllowed('customer', ['admin', 'staff'])).toBe(false)
    expect(roleAllowed('staff', ['customer'])).toBe(false)
  })

  it('allows nobody when no role is listed', () => {
    expect(roleAllowed('admin', [])).toBe(false)
  })
})
