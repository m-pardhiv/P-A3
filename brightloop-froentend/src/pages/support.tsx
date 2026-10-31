import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Clock3, Mail, MessageSquareText, Phone, Send } from 'lucide-react'
import { useId, useState } from 'react'
import { PortalGate } from '@/components/common/portal-gate'
import { CardSkeleton } from '@/components/common/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { company } from '@/config/company'
import { usePortal, usePortalData } from '@/context/portal'
import { useToast } from '@/context/toast'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate } from '@/lib/format'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'How do I download or print an invoice?',
    a: 'Open Invoices, then choose the download icon for a PDF or open the invoice and select “Print invoice”. Both include the full tax and discount breakdown.',
  },
  {
    q: 'What happens when my subscription renews?',
    a: 'Your renewal date is shown on each subscription. If your plan allows it, you can renew early from the subscription page and the new term is added on top of your current one.',
  },
  {
    q: 'Why can’t I pause or cancel one of my subscriptions?',
    a: 'Available actions depend on the plan you’re on. For example, annual contracts can’t be paused. If an action isn’t shown, it isn’t available online for that plan, so send us a request below.',
  },
  {
    q: 'My invoice is marked overdue. What should I do?',
    a: 'An invoice is overdue once its due date has passed without full payment. Check the Payment History page for failed attempts, then contact us if you need help or more time.',
  },
  {
    q: 'How do I update my billing address or tax ID?',
    a: 'Go to My Account → Billing information, choose Edit, and save. The new details appear on invoices issued from then on; earlier invoices aren’t changed.',
  },
]

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="border-b border-border/70 last:border-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold transition-colors hover:text-brand-ink"
        >
          {q}
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const topics = ['Billing', 'Subscriptions', 'Technical', 'Something else'].map((t) => ({ value: t, label: t }))

const statusTone = { received: 'warning', 'in-progress': 'info', resolved: 'success' } as const
const statusLabel = { received: 'Received', 'in-progress': 'In progress', resolved: 'Resolved' } as const

function RequestForm() {
  const { createSupportRequest } = usePortal()
  const toast = useToast()
  const [topic, setTopic] = useState('Billing')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = {
      subject: subject.trim() ? undefined : 'Add a short subject.',
      message: message.trim().length >= 10 ? undefined : 'Tell us a little more (at least 10 characters).',
    }
    setErrors(next)
    if (next.subject || next.message) return
    setBusy(true)
    try {
      const request = await createSupportRequest({ topic, subject: subject.trim(), message: message.trim() })
      toast.success('Request received', `Your reference is ${request.id}.`)
      setSubject('')
      setMessage('')
    } catch {
      toast.error('Couldn’t send your request', 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 px-5 pb-6 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <Field label="Topic" htmlFor="topic">
          <SimpleSelect id="topic" aria-label="Topic" value={topic} onValueChange={setTopic} options={topics} />
        </Field>
        <Field label="Subject" htmlFor="subject" error={errors.subject}>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setErrors((x) => ({ ...x, subject: undefined }))
            }}
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? 'subject-error' : undefined}
            placeholder="e.g. Add two more seats to Analytics"
          />
        </Field>
      </div>
      <Field label="How can we help?" htmlFor="message" error={errors.message}>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            setErrors((x) => ({ ...x, message: undefined }))
          }}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          placeholder="Share any details that will help us get this resolved quickly."
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>
          {!busy && <Send />} Send request
        </Button>
      </div>
    </form>
  )
}

function SupportContent() {
  const { supportRequests } = usePortalData()
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Send us a request</CardTitle>
              <CardDescription>We’ll reply to the email on your account.</CardDescription>
            </CardHeader>
            <RequestForm />
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frequently asked questions</CardTitle>
            </CardHeader>
            <div className="px-5 pb-2 sm:px-6">
              {faqs.map((f) => (
                <Faq key={f.q} {...f} />
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="space-y-6">
        <motion.div variants={staggerItem}>
          <Card className="mesh-hero overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Talk to a person</CardTitle>
              <CardDescription>Prefer to speak with us directly?</CardDescription>
            </CardHeader>
            <div className="space-y-2 px-5 pb-6 sm:px-6">
              <a
                href={`mailto:${company.supportEmail}`}
                className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/80 p-3.5 transition-colors hover:border-brand-raspberry/40"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-brand-ink">
                  <Mail className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Email support</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{company.supportEmail}</span>
                </span>
              </a>
              <a
                href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}
                className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/80 p-3.5 transition-colors hover:border-brand-raspberry/40"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-brand-ink">
                  <Phone className="size-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Call us</span>
                  <span className="block text-[13px] text-muted-foreground">{company.phone}</span>
                </span>
              </a>
              <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> Weekdays, 9am–6pm Pacific
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your recent requests</CardTitle>
            </CardHeader>
            <div className="px-5 pb-6 sm:px-6">
              {supportRequests.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquareText className="size-4" /> No requests yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  <AnimatePresence initial={false}>
                    {supportRequests.map((r) => (
                      <motion.li
                        key={r.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="overflow-hidden"
                      >
                        <div className="py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-snug">{r.subject}</p>
                            <Badge tone={statusTone[r.status]} dot>
                              {statusLabel[r.status]}
                            </Badge>
                          </div>
                          <p className="tabular mt-1 text-xs text-muted-foreground">
                            {r.id} · {r.topic} · {formatDate(r.createdAt)}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function SupportPage() {
  useDocumentTitle('Help & Support')
  return (
    <PortalGate
      fallback={
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <CardSkeleton className="h-96" />
          <CardSkeleton />
        </div>
      }
    >
      <SupportContent />
    </PortalGate>
  )
}
