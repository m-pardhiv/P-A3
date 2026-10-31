import { Search } from 'lucide-react'
import type { FormEvent } from 'react'

export function SearchBar(props: {
  value?: string
  label: string
  onSearch: (value: string | undefined) => void
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    props.onSearch(value || undefined)
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
      <input
        key={props.value}
        name="q"
        type="search"
        defaultValue={props.value}
        placeholder={props.label}
        aria-label={props.label}
        className="input"
      />
      <button type="submit" className="btn btn-secondary" aria-label="Search">
        <Search size={18} aria-hidden />
      </button>
    </form>
  )
}

export function FilterSelect(props: {
  label: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <select
      aria-label={props.label}
      value={props.value ?? ''}
      onChange={(event) => props.onChange(event.target.value || undefined)}
      className="input sm:w-44"
    >
      <option value="">{props.label}</option>
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function DateFilter(props: {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      {props.label}
      <input
        key={props.value}
        type="date"
        defaultValue={props.value}
        onChange={(event) => props.onChange(event.target.value || undefined)}
        className="input w-auto"
      />
    </label>
  )
}
