import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, Eye, EyeOff, Info } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DEMO_PASSWORD, PREVIEW_ACCOUNTS } from '@/api'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { canAccessPath, homeFor } from '@/config/navigation'
import { usePortal } from '@/context/portal'
import { useToast } from '@/context/toast'
import { InvoiceCard, PaymentCard, AnalyticsCard } from '@/features/landing/hero-cards'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { easeOut } from '@/lib/motion'

export default function LoginPage() {
  useDocumentTitle('Log in')
  const { session, signIn } = usePortal()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  // Already logged in: go straight to the area for this person's role.
  if (session && !busy) return <Navigate to={from && canAccessPath(session.role, from) ? from : homeFor(session.role)} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = {
      email: /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : 'Enter the email address on your account.',
      password: password ? undefined : 'Enter your password.',
    }
    setErrors(found)
    setFormError(undefined)
    if (found.email || found.password) return
    setBusy(true)
    try {
      const user = await signIn({ email, password })
      toast.success('Welcome back', `Logged in as ${user.name}.`)
      // Customers go to the portal, staff and admins to their consoles.
      navigate(from && canAccessPath(user.role, from) ? from : homeFor(user.role), { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'We couldn’t log you in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Brightloop home">
            <Logo />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeOut }}>
            <h1 className="text-4xl font-extrabold tracking-[-0.035em]">Welcome back</h1>
            <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
              Log in to your Brightloop account. We’ll take you to the right place.
            </p>

            <form onSubmit={submit} noValidate className="mt-8 space-y-4">
              <Field label="Email address" htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErrors((x) => ({ ...x, email: undefined }))
                  }}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  placeholder="you@company.com"
                />
              </Field>
              <Field label="Password" htmlFor="password" error={errors.password}>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrors((x) => ({ ...x, password: undefined }))
                    }}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              {formError && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] font-medium text-danger">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {formError}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" loading={busy}>
                Log in
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-border/80 bg-muted/60 p-4">
              <p className="flex items-center gap-2 text-[13px] font-bold">
                <Info className="size-4 text-brand-ink" /> Preview accounts
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                This is a preview with sample data. All accounts use the password{' '}
                <span className="font-semibold text-foreground">{DEMO_PASSWORD}</span>.
              </p>
              <ul className="mt-3 space-y-2">
                {PREVIEW_ACCOUNTS.map((a) => (
                  <li key={a.role} className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold">{a.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(a.email)
                        setPassword(DEMO_PASSWORD)
                        setErrors({})
                        setFormError(undefined)
                      }}
                      className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-colors hover:bg-brand-100"
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </main>

      <aside aria-hidden className="mesh-hero relative hidden overflow-hidden border-l border-border/70 lg:block">
        <div className="absolute -right-32 -top-32 size-[34rem] rounded-full border border-brand-raspberry/15" />
        <div className="relative flex h-full flex-col items-center justify-center px-12">
          <div className="relative h-[22rem] w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: -14 }}
              animate={{ opacity: 1, y: 0, rotate: -9 }}
              transition={{ duration: 0.7, delay: 0.2, ease: easeOut }}
              className="absolute left-0 top-10 h-52 w-40 rounded-[1.4rem] shadow-lift ring-1 ring-black/5"
            >
              <InvoiceCard />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: easeOut }}
              className="absolute left-1/2 top-0 z-10 h-72 w-52 -translate-x-1/2 rounded-[1.4rem] shadow-lift ring-1 ring-black/5"
            >
              <AnalyticsCard />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: 14 }}
              animate={{ opacity: 1, y: 0, rotate: 9 }}
              transition={{ duration: 0.7, delay: 0.4, ease: easeOut }}
              className="absolute right-0 top-14 h-52 w-40 rounded-[1.4rem] shadow-lift ring-1 ring-black/5"
            >
              <PaymentCard />
            </motion.div>
          </div>
          <h2 className="mt-8 max-w-sm text-center text-3xl font-extrabold leading-tight tracking-[-0.03em]">
            Everything you’ve bought, <span className="text-gradient">in one place.</span>
          </h2>
        </div>
      </aside>
    </div>
  )
}
