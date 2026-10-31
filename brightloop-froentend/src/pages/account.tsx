import { motion } from 'framer-motion'
import { AlertCircle, Eye, EyeOff, KeyRound, Pencil } from 'lucide-react'
import { useState } from 'react'
import { PortalGate } from '@/components/common/portal-gate'
import { CardSkeleton } from '@/components/common/skeletons'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { DEMO_PASSWORD } from '@/api'
import { usePortal, usePortalData } from '@/context/portal'
import { useToast } from '@/context/toast'
import { useSectionForm } from '@/features/account/use-section-form'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate } from '@/lib/format'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types'

const emailRe = /^\S+@\S+\.\S+$/

function SectionCard({
  title,
  description,
  editing,
  onEdit,
  onCancel,
  onSubmit,
  saving,
  formError,
  children,
  hideEdit,
  submitLabel = 'Save changes',
}: {
  title: string
  description: string
  editing?: boolean
  onEdit?: () => void
  onCancel?: () => void
  onSubmit: (e: React.FormEvent) => void
  saving?: boolean
  formError?: string
  children: React.ReactNode
  hideEdit?: boolean
  submitLabel?: string
}) {
  const showActions = hideEdit || editing
  return (
    <motion.div variants={staggerItem}>
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {!hideEdit && !editing && (
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                <Pencil /> Edit
              </Button>
            )}
          </CardHeader>
          <div className="px-5 pb-6 sm:px-6">
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
            {formError && (
              <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] font-medium text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {formError}
              </p>
            )}
            {showActions && (
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {!hideEdit && (
                  <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" loading={saving}>
                  {submitLabel}
                </Button>
              </div>
            )}
          </div>
        </form>
      </Card>
    </motion.div>
  )
}

function PersonalSection({ customer }: { customer: Customer }) {
  const { updateCustomer } = usePortal()
  const toast = useToast()
  const form = useSectionForm({
    initial: { fullName: customer.fullName, email: customer.email, phone: customer.phone, companyName: customer.companyName },
    validate: (v) => ({
      fullName: v.fullName.trim() ? undefined : 'Enter your full name.',
      email: emailRe.test(v.email.trim()) ? undefined : 'Enter a valid email address.',
      phone: v.phone.replace(/\D/g, '').length >= 7 ? undefined : 'Enter a valid phone number.',
      companyName: v.companyName.trim() ? undefined : 'Enter your company name.',
    }),
    onSave: async (v) => {
      await updateCustomer({ fullName: v.fullName.trim(), email: v.email.trim(), phone: v.phone.trim(), companyName: v.companyName.trim() })
      toast.success('Profile updated', 'Your personal information was saved.')
    },
  })
  const { values: v, errors: e, editing } = form
  const common = (id: keyof typeof v) =>
    ({
      id,
      readOnly: !editing,
      value: v[id],
      'aria-invalid': !!e[id],
      'aria-describedby': e[id] ? `${id}-error` : undefined,
      onChange: (ev: React.ChangeEvent<HTMLInputElement>) => form.setField(id, ev.target.value),
    }) as const

  return (
    <SectionCard
      title="Personal information"
      description="How we address you and reach you about your account."
      editing={editing}
      onEdit={form.start}
      onCancel={form.cancel}
      onSubmit={form.save}
      saving={form.saving}
      formError={form.formError}
    >
      <Field label="Full name" htmlFor="fullName" error={e.fullName}>
        <Input autoComplete="name" {...common('fullName')} />
      </Field>
      <Field label="Email address" htmlFor="email" error={e.email}>
        <Input type="email" autoComplete="email" {...common('email')} />
      </Field>
      <Field label="Phone number" htmlFor="phone" error={e.phone}>
        <Input type="tel" autoComplete="tel" {...common('phone')} />
      </Field>
      <Field label="Company name" htmlFor="companyName" error={e.companyName}>
        <Input autoComplete="organization" {...common('companyName')} />
      </Field>
    </SectionCard>
  )
}

const taxTypes = [
  { value: 'none', label: 'Not applicable' },
  { value: 'EIN', label: 'EIN (US)' },
  { value: 'VAT', label: 'VAT number' },
  { value: 'GST', label: 'GST number' },
  { value: 'Other', label: 'Other' },
]

function BillingSection({ customer }: { customer: Customer }) {
  const { updateCustomer } = usePortal()
  const toast = useToast()
  const a = customer.billingAddress
  const form = useSectionForm({
    initial: {
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      billingEmail: customer.billingEmail,
      taxIdType: customer.taxId ? customer.taxIdType || 'Other' : 'none',
      taxId: customer.taxId,
    },
    validate: (v) => ({
      line1: v.line1.trim() ? undefined : 'Enter the street address.',
      city: v.city.trim() ? undefined : 'Enter the city.',
      state: v.state.trim() ? undefined : 'Enter the state or region.',
      postalCode: v.postalCode.trim() ? undefined : 'Enter the postal code.',
      country: v.country.trim() ? undefined : 'Enter the country.',
      billingEmail: emailRe.test(v.billingEmail.trim()) ? undefined : 'Enter a valid billing email.',
      taxId: v.taxIdType !== 'none' && !v.taxId.trim() ? 'Enter your tax ID, or choose “Not applicable”.' : undefined,
    }),
    onSave: async (v) => {
      await updateCustomer({
        billingAddress: {
          line1: v.line1.trim(),
          line2: v.line2.trim() || undefined,
          city: v.city.trim(),
          state: v.state.trim(),
          postalCode: v.postalCode.trim(),
          country: v.country.trim(),
        },
        billingEmail: v.billingEmail.trim(),
        taxIdType: v.taxIdType === 'none' ? '' : v.taxIdType,
        taxId: v.taxIdType === 'none' ? '' : v.taxId.trim(),
      })
      toast.success('Billing details updated', 'New invoices will use these details.')
    },
  })
  const { values: v, errors: e, editing } = form
  const common = (id: keyof typeof v) =>
    ({
      id,
      readOnly: !editing,
      value: v[id],
      'aria-invalid': !!e[id],
      'aria-describedby': e[id] ? `${id}-error` : undefined,
      onChange: (ev: React.ChangeEvent<HTMLInputElement>) => form.setField(id, ev.target.value),
    }) as const

  return (
    <SectionCard
      title="Billing information"
      description="Printed on your invoices. Changes apply to invoices issued from now on."
      editing={editing}
      onEdit={form.start}
      onCancel={form.cancel}
      onSubmit={form.save}
      saving={form.saving}
      formError={form.formError}
    >
      <Field label="Address line 1" htmlFor="line1" error={e.line1} className="sm:col-span-2">
        <Input autoComplete="address-line1" {...common('line1')} />
      </Field>
      <Field label="Address line 2" htmlFor="line2" className="sm:col-span-2">
        <Input autoComplete="address-line2" placeholder={editing ? 'Suite, floor, etc. (optional)' : ''} {...common('line2')} />
      </Field>
      <Field label="City" htmlFor="city" error={e.city}>
        <Input autoComplete="address-level2" {...common('city')} />
      </Field>
      <Field label="State / region" htmlFor="state" error={e.state}>
        <Input autoComplete="address-level1" {...common('state')} />
      </Field>
      <Field label="Postal code" htmlFor="postalCode" error={e.postalCode}>
        <Input autoComplete="postal-code" {...common('postalCode')} />
      </Field>
      <Field label="Country" htmlFor="country" error={e.country}>
        <Input autoComplete="country-name" {...common('country')} />
      </Field>
      <Field label="Billing email" htmlFor="billingEmail" error={e.billingEmail} hint="Invoices are sent here." className="sm:col-span-2">
        <Input type="email" {...common('billingEmail')} />
      </Field>
      <Field label="Tax ID type" htmlFor="taxIdType">
        <SimpleSelect
          id="taxIdType"
          aria-label="Tax ID type"
          disabled={!editing}
          value={v.taxIdType}
          onValueChange={(t) => {
            form.setField('taxIdType', t)
            if (t === 'none') form.setField('taxId', '')
          }}
          options={taxTypes}
          className={cn(!editing && 'bg-muted/60')}
        />
      </Field>
      <Field label="Tax ID" htmlFor="taxId" error={e.taxId} hint={v.taxIdType === 'none' ? 'Only needed if your company is tax-registered.' : undefined}>
        <Input {...common('taxId')} readOnly={!editing || v.taxIdType === 'none'} placeholder={v.taxIdType === 'none' ? '—' : ''} />
      </Field>
    </SectionCard>
  )
}

function strength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  return score
}
const strengthLabels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']
const strengthColors = ['bg-border', 'bg-danger', 'bg-brand-amber', 'bg-brand-raspberry', 'bg-success']

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: React.ReactNode
  autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  )
}

function SecuritySection() {
  const { changePassword } = usePortal()
  const toast = useToast()
  const [reset, setReset] = useState(0)
  return <SecurityForm key={reset} changePassword={changePassword} onDone={() => { toast.success('Password updated', 'Use your new password next time you sign in.'); setReset((n) => n + 1) }} />
}

function SecurityForm({ changePassword, onDone }: { changePassword: ReturnType<typeof usePortal>['changePassword']; onDone: () => void }) {
  const form = useSectionForm({
    initial: { current: '', next: '', confirm: '' },
    validate: (v) => ({
      current: v.current ? undefined : 'Enter your current password.',
      next: v.next.length >= 8 ? (v.next === v.current ? 'Choose a password you haven’t used before.' : undefined) : 'Use at least 8 characters.',
      confirm: v.confirm === v.next ? undefined : 'Passwords don’t match.',
    }),
    onSave: async (v) => {
      await changePassword({ currentPassword: v.current, newPassword: v.next })
      onDone()
    },
  })
  const { values: v, errors: e } = form
  const score = v.next ? Math.max(1, Math.min(4, strength(v.next))) : 0

  return (
    <SectionCard
      title="Security"
      description="Change the password you use to sign in."
      hideEdit
      onSubmit={form.save}
      saving={form.saving}
      formError={form.formError}
      submitLabel="Update password"
    >
      <PasswordField
        id="current"
        label="Current password"
        value={v.current}
        onChange={(x) => form.setField('current', x)}
        error={e.current}
        autoComplete="current-password"
        hint={<>Preview tip: the sample password is “{DEMO_PASSWORD}”.</>}
      />
      <div className="hidden sm:block" />
      <div>
        <PasswordField id="next" label="New password" value={v.next} onChange={(x) => form.setField('next', x)} error={e.next} autoComplete="new-password" />
        {v.next && (
          <div className="mt-2.5" aria-live="polite">
            <div className="flex gap-1.5" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  className={cn('h-1.5 flex-1 rounded-full', i <= score ? strengthColors[score] : 'bg-border')}
                  initial={false}
                  animate={{ opacity: i <= score ? 1 : 0.6 }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Strength: <span className="font-semibold text-foreground">{strengthLabels[score]}</span>
            </p>
          </div>
        )}
      </div>
      <PasswordField id="confirm" label="Confirm new password" value={v.confirm} onChange={(x) => form.setField('confirm', x)} error={e.confirm} autoComplete="new-password" />
    </SectionCard>
  )
}

function AccountContent() {
  const { customer } = usePortalData()
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-3xl space-y-6">
      <motion.div variants={staggerItem}>
        <Card className="mesh-hero overflow-hidden">
          <div className="flex items-center gap-4 p-5 sm:gap-5 sm:p-7">
            <Avatar name={customer.fullName} className="size-16 text-xl sm:size-[4.5rem]" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{customer.fullName}</h2>
              <p className="truncate text-sm text-muted-foreground">
                {customer.jobTitle ? `${customer.jobTitle} · ` : ''}
                {customer.companyName}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <KeyRound className="size-3.5" /> Customer since {formatDate(customer.memberSince)}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
      <PersonalSection customer={customer} />
      <BillingSection customer={customer} />
      <SecuritySection />
    </motion.div>
  )
}

export default function AccountPage() {
  useDocumentTitle('My Account')
  return (
    <PortalGate
      fallback={
        <div className="mx-auto max-w-3xl space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      }
    >
      <AccountContent />
    </PortalGate>
  )
}
