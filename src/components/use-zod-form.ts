import { useMutation } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import type { z } from 'zod'
import type { ActionResult, FieldErrors } from '~/shared/result'

function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    errors[issue.path.join('.')] ??= issue.message
  }
  return errors
}

/**
 * Checks a form with the same Zod schema the server uses, then maps failures to fields.
 * It sends the raw values, not the parsed ones: schemas such as money transform their input,
 * and the server runs that same transform.
 */
export function useZodForm<TSchema extends z.ZodType, TData>(options: {
  schema: TSchema
  /** Values held in state rather than inputs, such as repeating lines. */
  values?: () => Record<string, unknown>
  submit: (data: z.input<TSchema>) => Promise<ActionResult<TData>>
  onSuccess: (data: TData, form: HTMLFormElement) => void
}) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const mutation = useMutation({ mutationFn: options.submit })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setFormError(undefined)

    const raw = { ...Object.fromEntries(new FormData(form)), ...options.values?.() }
    const parsed = options.schema.safeParse(raw)
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error))
      return
    }
    setFieldErrors({})

    try {
      const result = await mutation.mutateAsync(raw as z.input<TSchema>)
      if (result.ok) {
        options.onSuccess(result.data, form)
      } else {
        setFieldErrors(result.fieldErrors ?? {})
        setFormError(result.error)
      }
    } catch {
      // Thrown errors can carry SQL text, so they never reach the screen.
      setFormError('That did not save. Try again, or sign in again if your session ended.')
    }
  }

  return { onSubmit, fieldErrors, formError, pending: mutation.isPending }
}
