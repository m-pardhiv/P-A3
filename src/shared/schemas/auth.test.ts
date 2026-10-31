import { describe, expect, it } from 'vitest'
import { passwordSchema } from './auth'

const messageFor = (password: string) => passwordSchema.safeParse(password).error?.issues[0].message

describe('password rules', () => {
  it('accepts a password meeting every rule', () => {
    expect(passwordSchema.safeParse('Brightl0op!').success).toBe(true)
  })

  it('accepts exactly 9 characters', () => {
    expect(passwordSchema.safeParse('Abcdefgh!').success).toBe(true)
  })

  it('rejects exactly 8 characters', () => {
    expect(messageFor('Abcdefg!')).toBe('Use more than 8 characters')
  })

  it('requires an uppercase letter', () => {
    expect(messageFor('brightloop!')).toBe('Add at least one uppercase letter')
  })

  it('requires a lowercase letter', () => {
    expect(messageFor('BRIGHTLOOP!')).toBe('Add at least one lowercase letter')
  })

  it('requires a special character', () => {
    expect(messageFor('Brightloop1')).toBe('Add at least one special character')
  })

  it('rejects passwords longer than bcrypt can hash', () => {
    expect(messageFor(`Aa!${'x'.repeat(70)}`)).toBe('Use 72 characters or fewer')
  })
})
