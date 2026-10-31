import { useCallback, useState } from 'react'

type Errors<T> = Partial<Record<keyof T, string>>

/** Small form state machine for an "Edit → Save / Cancel" settings section. */
export function useSectionForm<T extends object>({
  initial,
  validate,
  onSave,
}: {
  initial: T
  validate: (values: T) => Errors<T>
  onSave: (values: T) => Promise<void>
}) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Errors<T>>({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string>()

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }, [])

  const start = () => setEditing(true)

  const cancel = () => {
    setValues(initial)
    setErrors({})
    setFormError(undefined)
    setEditing(false)
  }

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.values(found).some(Boolean)) return false
    setSaving(true)
    setFormError(undefined)
    try {
      await onSave(values)
      setEditing(false)
      return true
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'We couldn’t save your changes.')
      return false
    } finally {
      setSaving(false)
    }
  }

  return { values, errors, editing, saving, formError, setField, start, cancel, save }
}
