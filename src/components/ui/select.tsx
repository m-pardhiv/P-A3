import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '~/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-11 w-full items-center justify-between gap-2 rounded-control border border-input bg-card px-3.5 text-sm font-medium text-foreground transition-[border-color,box-shadow] hover:border-foreground/25 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:truncate',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className={cn(
          'z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] origin-[var(--radix-select-content-transform-origin)] animate-fade-scale-in overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lift',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:font-semibold',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-3">
        <Check className="size-4 text-brand-raspberry" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

/** Convenience wrapper for the common label + options use. */
export function SimpleSelect({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  className,
  icon,
  id,
  disabled,
}: {
  id?: string
  disabled?: boolean
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  'aria-label': string
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
