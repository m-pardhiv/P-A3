import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(9, 'Use more than 8 characters')
  // bcrypt ignores everything after 72 bytes.
  .max(72, 'Use 72 characters or fewer')
  .regex(/[A-Z]/, 'Add at least one uppercase letter')
  .regex(/[a-z]/, 'Add at least one lowercase letter')
  .regex(/[^A-Za-z0-9]/, 'Add at least one special character')

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))

const nameSchema = z.string().trim().min(2, 'Enter a name of at least 2 characters').max(120)

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const createStaffSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})
