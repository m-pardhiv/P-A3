import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react'

type FieldProps = { label: string; name: string; error?: string; hint?: string }

function FieldShell(props: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}) {
  const { id, label, required, error, hint, children } = props
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        {label}
        {required ? (
          <span aria-hidden className="text-danger">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const ariaFor = (id: string, error?: string, hint?: string) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
})

export function FormField(props: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const { label, error, hint, ...input } = props
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={input.required} error={error} hint={hint}>
      <input {...input} id={id} className="input" {...ariaFor(id, error, hint)} />
    </FieldShell>
  )
}

export function SelectField(
  props: SelectHTMLAttributes<HTMLSelectElement> &
    FieldProps & { options: { value: string; label: string }[]; placeholder?: string },
) {
  const { label, error, hint, options, placeholder, ...select } = props
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={select.required} error={error} hint={hint}>
      <select {...select} id={id} className="input" {...ariaFor(id, error, hint)}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const { label, error, hint, ...textarea } = props
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={textarea.required} error={error} hint={hint}>
      <textarea
        rows={3}
        {...textarea}
        id={id}
        className="input py-2"
        {...ariaFor(id, error, hint)}
      />
    </FieldShell>
  )
}

export function CheckboxField(props: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const { label, error, hint, ...input } = props
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-start gap-2 text-sm font-medium">
        <input
          {...input}
          id={id}
          type="checkbox"
          className="mt-0.5 size-4 accent-ink"
          {...ariaFor(id, error, hint)}
        />
        {label}
      </label>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pl-6 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  )
}
