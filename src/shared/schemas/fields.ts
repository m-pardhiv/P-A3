import { z } from 'zod'

/** A `<input type="hidden" name="id">`: empty when creating, a uuid when editing. */
export const optionalId = z
  .union([z.literal(''), z.uuid()])
  .nullish()
  .transform((value) => value || null)

export const requiredId = (message: string) => z.uuid(message)

export const requiredText = (message: string) => z.string().trim().min(1, message).max(200)

export const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((value) => value || null)

export const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

/** Rupees as typed in a form, converted to integer paise without going through a float. */
export const rupeesToPaise = (rupees: string) => {
  const [whole, fraction = ''] = rupees.trim().split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}

export const moneySchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().trim().regex(MONEY_PATTERN, 'Enter an amount such as 1200 or 1200.50'))
  .transform(rupeesToPaise)

export const wholeNumber = (min: number, message: string) =>
  z
    .union([z.string(), z.number()])
    .transform(Number)
    .pipe(z.number(message).int(message).min(min, message))

export const checkbox = z
  .union([z.literal('on'), z.boolean()])
  .optional()
  .transform((value) => value === 'on' || value === true)

const isRealDate = (value: string) => !Number.isNaN(Date.parse(value))

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
  .refine(isRealDate, 'Choose a real date')

export const optionalDate = z
  .union([z.literal(''), dateSchema])
  .nullish()
  .transform((value) => value || null)

export const idInput = z.object({ id: z.string() })
