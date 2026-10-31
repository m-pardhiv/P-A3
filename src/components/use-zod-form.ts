import { useMutation } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import type { z } from 'zod'
import type { ActionResult, FieldErrors } from '~/shared/result'

function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    errors[String(issue.path[0])] ??= issue.message
  }
  return errors
}

/** Runs a form through the same Zod schema the server uses, then maps failures to fields. */
export function useZodForm<TSchema extends z.ZodType, TData>(options: {
  schema: TSchema
  submit: (data: z.output<TSchema>) => Promise<ActionResult<TData>>
  onSuccess: (data: TData, form: HTMLFormElement) => void
}) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const mutation = useMutation({ mutationFn: options.submit })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setFormError(undefined)

    const parsed = options.schema.safeParse(Object.fromEntries(new FormData(form)))
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error))
      return
    }
    setFieldErrors({})

    try {
      const result = await mutation.mutateAsync(parsed.data)
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
