# Checklist status

Where each part of the project checklist stands, and how it was checked.

- **Done** means it is built, and the evidence column says how it was checked.
- **Needs you** means it depends on something only the owner can provide, such as a server, a
  domain or an email provider. Nothing here is silently skipped.

"Test" names a file under `src/`. "E2E" is `pnpm test:e2e`, which drives a real browser.
"Run" means it was run by hand on this build and the result was observed.

## 1. Registration, login and roles

| Item                                                                  | Status | Evidence                                                                                                               |
| --------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Unique email, duplicate refused (any letter case)                     | Done   | Test `server/auth-core.test.ts`, `db/constraints.test.ts`; E2E                                                         |
| Password over 8 characters with upper, lower and special              | Done   | Test `shared/schemas/auth.test.ts`; E2E shows the field message                                                        |
| bcrypt hashing, cost 12                                               | Done   | Test `auth-core.test.ts` checks the `$2b$12$` hash and that the password is not stored                                 |
| Login, logout, protected pages                                        | Done   | Test `auth-core.test.ts`; E2E (signed-out visitors go to the sign-in page)                                             |
| Session tokens stored hashed (SHA-256)                                | Done   | Test `auth-core.test.ts`                                                                                               |
| Cookie HttpOnly, SameSite=Lax, Secure in production                   | Done   | Run: production server sets `httpOnly`, `secure`, `Lax`, 7 days                                                        |
| Sessions last 7 days                                                  | Done   | Test `auth-core.test.ts` checks one second either side of 7 days                                                       |
| Reset: request, emailed link, hashed token, 1 hour expiry, single use | Done   | Test `auth-core.test.ts` (including two simultaneous uses); E2E                                                        |
| Reset signs out every session                                         | Done   | Test `auth-core.test.ts`                                                                                               |
| Reset through a real SMTP connection                                  | Done   | Run: production server sent the email to an SMTP listener, link included. A real provider is untested (see section 13) |
| Admin, staff and customer permissions, enforced on the server         | Done   | Test `domain/roles.test.ts`; every server function starts with `requireRole`; E2E (wrong-role pages redirect)          |
| Only admin adds staff                                                 | Done   | E2E; the Staff route and function are admin-only                                                                       |
| Login rate limit (5 wrong tries per email in 15 minutes)              | Done   | Test `domain/rate-limit.test.ts`; E2E                                                                                  |
| Forms never fall back to GET (no password in the address bar)         | Done   | E2E checks `method="post"`                                                                                             |

## 2. Products

| Item                                                            | Status | Evidence                                                                                      |
| --------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Create and edit with name, type, sales price, cost price, notes | Done   | E2E loads the pages; schema `shared/schemas/catalogue.ts`                                     |
| Several variants, each with its own extra price (Odoo +560)     | Done   | Test `domain/subscription.test.ts` (variant pricing)                                          |
| Invalid prices and missing fields refused                       | Done   | Zod on client and server, plus database checks (`db/constraints.test.ts`)                     |
| Deactivate                                                      | Done   | The Active switch. Products are not deleted, because invoices and subscriptions refer to them |
| Product changes do not alter old invoices                       | Done   | Test `history-stability.test.ts`                                                              |

## 3. Plans

| Item                                                              | Status | Evidence                                                                  |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Name, price, daily/weekly/monthly/yearly, minimum quantity, dates | Done   | Test `billing-intervals.test.ts` bills each interval                      |
| Auto close, early close, pause and renew flags, per plan          | Done   | Test `domain/subscription-state.test.ts`; E2E checks the buttons per plan |
| Unavailable outside their dates                                   | Done   | Test `domain/subscription.test.ts` (`planAvailableOn`, `planError`)       |
| Admin edits and deactivates; staff view only                      | Done   | E2E (staff has no New plan button and is redirected from `/plans/new`)    |
| Customers see only plans open today                               | Done   | E2E (Plans tab lists open plans, not the ended one)                       |

## 4. Quotations

| Item                                                 | Status | Evidence                                                                                       |
| ---------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Templates with plan, product lines, validity days    | Done   | Run: seeded templates; E2E                                                                     |
| Expiry date from the validity days                   | Done   | Test `domain/dates.test.ts`                                                                    |
| Totals and tax                                       | Done   | E2E: ₹5,519.00 + ₹993.42 = ₹6,512.42                                                           |
| Create, view, edit by permission                     | Done   | Subscription pages; lines editable only in Draft and Quotation                                 |
| Email to the customer                                | Done   | Test `quotations.test.ts` (sent, stamped, logged, refused when expired or failing); E2E        |
| Print or save as PDF                                 | Done   | `/print/quotation/:id`; E2E                                                                    |
| Expired quotation identified, cannot be confirmed    | Done   | Test `history-stability.test.ts`; E2E                                                          |
| Conversion keeps lines, prices and tax; no duplicate | Done   | Test `history-stability.test.ts`. A quotation is the same record, so conversion copies nothing |

## 5. Subscriptions

| Item                                                                           | Status | Evidence                                                                                       |
| ------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------- |
| Unique number, customer, plan, dates, payment terms, lines                     | Done   | Test `db/constraints.test.ts`; E2E                                                             |
| Totals, minimum quantity                                                       | Done   | Test `domain/subscription.test.ts`                                                             |
| Draft, Quotation, Confirmed, Active, Paused, Closed and the rules between them | Done   | Test `domain/subscription-state.test.ts`; the server rechecks inside a lock                    |
| Unauthorised users cannot change status                                        | Done   | Server functions check the role; the portal allows only pause, resume, close on one's own      |
| Close early, pause, resume, renew by plan rules                                | Done   | Test `subscription-events.test.ts`; E2E                                                        |
| Renewal draft copied from the old one, linked, once only                       | Done   | Test `db/constraints.test.ts`, `subscription-events.test.ts`                                   |
| Expired subscriptions handled (auto close)                                     | Done   | Test `billing-run.test.ts`                                                                     |
| History preserved                                                              | Done   | New: `subscription_events`, shown on the subscription page. Test `subscription-events.test.ts` |
| Customers see only their own                                                   | Done   | Test `portal.test.ts`; E2E                                                                     |
| Asia/Kolkata dates                                                             | Done   | `server/clock.ts`; dashboard tests fix the date                                                |

## 6. Invoices

| Item                                                              | Status | Evidence                                                                                                         |
| ----------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| Generated from subscriptions with customer details, lines and tax | Done   | Test `billing-run.test.ts`                                                                                       |
| Customer snapshot kept                                            | Done   | Test `history-stability.test.ts` renames the customer afterwards                                                 |
| Unique numbers, no duplicates, no skipped periods                 | Done   | Tests `billing-run.test.ts`, `billing-intervals.test.ts` (all four intervals, repeat runs, two runs at once)     |
| Draft, confirm, paid, cancel, send, print                         | Done   | Test `domain/invoice-state.test.ts`; E2E                                                                         |
| Discounts as negative lines                                       | Done   | Test `billing-run.test.ts`, `domain/discounts.test.ts`                                                           |
| Overdue derived, due date from payment terms                      | Done   | Test `dashboard.test.ts`, `domain/invoice-state.test.ts`; E2E                                                    |
| Failed generation retried safely                                  | Done   | Test `billing-intervals.test.ts`: a failed subscription is untouched, the rest are billed, a retry bills it once |
| Totals worked out on the server                                   | Done   | The client never sends totals                                                                                    |

## 7. Discounts

| Item                                                                                                  | Status | Evidence                                                               |
| ----------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Admin only; fixed (paise) and percent (whole number); minimums; dates; limit; product or subscription | Done   | Test `domain/discounts.test.ts`; E2E                                   |
| Applied automatically on the next invoice; stops at expiry or when used up                            | Done   | Test `billing-run.test.ts`                                             |
| Never takes more than the amount                                                                      | Done   | Test `domain/discounts.test.ts`                                        |
| Usage limit holds under simultaneous billing                                                          | Done   | Test `billing-intervals.test.ts` (3 runs racing for one remaining use) |

## 8. Payments

| Item                                                        | Status | Evidence                                                                   |
| ----------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| Record with method, amount, date, note; several per invoice | Done   | Test `payments.test.ts`; E2E                                               |
| Overpayment, future dates, wrong status refused             | Done   | Test `payments.test.ts`                                                    |
| Paid flips automatically; balances correct                  | Done   | Test `payments.test.ts`; E2E                                               |
| Duplicate payment prevented                                 | Done   | New idempotency key. Test `payments.idempotency.test.ts`; E2E double-click |
| Two payments at once cannot overpay                         | Done   | Test `payments.idempotency.test.ts`                                        |
| Who recorded each payment                                   | Done   | `recorded_by`, shown on the invoice                                        |
| Customers see their own                                     | Done   | Portal invoice page; test `portal.test.ts`                                 |
| Overdue follow-up list                                      | Done   | Invoices filter, dashboard Overdue table                                   |
| Reminders by email, failures handled, history kept          | Done   | New. Test `reminders.test.ts`; E2E                                         |

## 9. Dashboard

| Item                                                               | Status | Evidence                                                                                                          |
| ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Active subscriptions, MRR, revenue, outstanding, overdue, ageing   | Done   | Test `dashboard.test.ts` checks every figure against known records                                                |
| Filters: date, plan, customer, subscription status, invoice status | Done   | Test `dashboard.test.ts`; E2E                                                                                     |
| Respects roles                                                     | Done   | Admin and staff only; customers are redirected                                                                    |
| Large datasets                                                     | Done   | Run: with 5,016 subscriptions and 30,026 invoices every query is under 30 ms and every page loads in 0.7 to 1.0 s |
| Consistent currency formatting                                     | Done   | One formatter, `Intl.NumberFormat('en-IN')`                                                                       |

## 10. Database and security

| Item                                                       | Status    | Evidence                                                                                                                                                         |
| ---------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres, Drizzle, migrations, seed                        | Done      | Run on a fresh machine; `pnpm db:setup`                                                                                                                          |
| **Supabase**                                               | Not used  | You moved the project to local Postgres on purpose. A hosted Postgres still works: put its Session pooler URL in `DATABASE_URL` (see README)                     |
| Foreign keys, unique and check constraints, indexes        | Done      | Test `db/constraints.test.ts`; the performance run confirms index use                                                                                            |
| Transactions around financial changes                      | Done      | Billing, payments, discounts, renewals                                                                                                                           |
| Row Level Security on every table                          | Done      | Every table calls `.enableRLS()`                                                                                                                                 |
| No policies                                                | By design | The app connects as the table owner, so it is unaffected; any other role is locked out. No client talks to the database directly, so policies would have no user |
| Customers cannot see each other's data                     | Done      | Test `portal.test.ts`; E2E                                                                                                                                       |
| Nothing sensitive reaches the browser                      | Done      | Run: the build was searched for server-only strings                                                                                                              |
| Secrets in environment variables                           | Done      | `.env` is git-ignored; `.env.example` documents each                                                                                                             |
| Nothing in plaintext (passwords, session and reset tokens) | Done      | Tests `auth-core.test.ts`                                                                                                                                        |
| Seed and reset cannot erase real data                      | Done      | New guard. Test `db/seed-guard.test.ts`: never in production; refuses any database that is not local                                                             |
| One default tax rule                                       | Done      | Test `db/constraints.test.ts`                                                                                                                                    |
| Failed operations leave no half records                    | Done      | Transactions. Test `billing-intervals.test.ts` forces a billing failure: nothing is left behind, the others are billed, and a retry succeeds                     |

## 11. Interface

| Item                                                                          | Status | Evidence                                                         |
| ----------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| Layout, navigation, labels, validation messages, success toasts, empty states | Done   | E2E loads every page; one layout and shared components           |
| Required fields marked                                                        | Done   | New: an asterisk on required labels                              |
| Loading states                                                                | Done   | A pending component on every route                               |
| Confirm before destructive actions                                            | Done   | Close, cancel, delete all use the confirm dialog                 |
| Search, filters, pagination                                                   | Done   | 20 per page on every table                                       |
| Desktop and mobile                                                            | Done   | E2E: no sideways scrolling at 375 px on 16 pages                 |
| Role-based interface                                                          | Done   | E2E: different sidebars per role; the server enforces regardless |

## 12. Testing

| Item                                                                                                | Status                                                               |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Authentication, products, plans, subscriptions, invoices, discounts, payments, dashboard, isolation | Done: see the Test column above. 24 test files                       |
| Concurrency: billing, discounts, payments, reset links, confirmations                               | Done                                                                 |
| Every billing interval                                                                              | Done                                                                 |
| Performance with large datasets                                                                     | Done: `pnpm db:seed:perf`, `pnpm db:explain`, plus real page timings |
| End to end                                                                                          | Done: `pnpm test:e2e`                                                |
| Typecheck, lint, build                                                                              | Pass, on Node 22 and Node 24                                         |

## 13. Deployment

| Item                                                                         | Status                                                                                                               |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Node 24, pnpm                                                                | Done: tested on Node 24.22 and 22; `.nvmrc` pins 24                                                                  |
| Environment variables documented                                             | Done: `.env.example`, `docs/OPERATIONS.md`                                                                           |
| Production build and start                                                   | Done: `pnpm build`, `pnpm start`; run in production mode, static files served, dotfiles refused                      |
| Health check, structured logs                                                | Done: `/api/health`, one JSON line per event                                                                         |
| Backup and recovery                                                          | Written down in `docs/OPERATIONS.md`. A restore has not been rehearsed on your data                                  |
| Production database and migrations                                           | **Needs you.** Needs your server or provider                                                                         |
| Production SMTP                                                              | **Needs you.** The code path works (tested against an SMTP listener); a real provider's credentials are yours to set |
| HTTPS                                                                        | **Needs you.** The app is ready (Secure cookie, `TRUST_PROXY`); the certificate comes from your proxy or host        |
| Deployed application, production authentication and email, uptime monitoring | **Needs you.** Nothing has been deployed                                                                             |

## 14. Project setup

Everything in this section is Done: install, migrate, seed, dev server, test, typecheck and lint
commands all work, the README setup is five commands, the demo accounts are documented as
development-only, and password reset links are visible in the server console locally.
