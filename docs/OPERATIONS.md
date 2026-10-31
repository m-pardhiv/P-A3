# Running Brightloop in production

This is the short version of what someone operating the app needs. Development setup is in the
README.

## Requirements

- Node 24 (22 also works), pnpm, PostgreSQL 16 or newer.
- One always-on Node process. The daily billing job is a timer inside the server, so a
  serverless host that sleeps between requests will skip billing unless you also call the
  Billing page's run (or restart the process) each day.
- An email provider: Resend (`RESEND_API_KEY`) or any SMTP server. With `NODE_ENV=production` and
  neither, password reset, invoice, quotation and reminder emails all fail, and say so.

## First deployment

1. Create a database and a role that owns it. The app connects as that role, never as a superuser.
2. Set the environment variables below. Keep them out of the repository: `.env` is git-ignored.
3. `pnpm install --frozen-lockfile`
4. `pnpm db:migrate` (applies the migrations only: no demo data)
5. `pnpm build`
6. `NODE_ENV=production pnpm start`

Then create the first admin. The seed script is deliberately blocked in production because its
accounts share a public password. Insert the admin yourself, with a bcrypt hash made on your own
machine:

```sh
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'a-Strong#Password1'
psql "$DATABASE_URL" -c "insert into users (email, password_hash, role, name) values ('you@company.example', '<the hash>', 'admin', 'Your Name')"
```

Admins add staff from the Staff page, and customers sign up themselves.

## Environment variables

See `.env.example`, which documents every one. The ones that matter in production:

| Variable                                                        | Why                                                       |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `NODE_ENV=production`                                           | Secure cookie, no demo seed, no reset, email must be real |
| `DATABASE_URL`                                                  | The database. Non-local hosts use TLS automatically       |
| `APP_URL`                                                       | The public https address, used in every emailed link      |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email delivery                                            |
| `TRUST_PROXY=true`                                              | Only behind your own reverse proxy                        |
| `BILLING_SCHEDULER`, `BILLING_HOUR`                             | When the daily billing job runs                           |

## HTTPS

Terminate TLS at a reverse proxy (nginx, Caddy, a cloud load balancer) and forward to the app.
Set `APP_URL` to the https address and `TRUST_PROXY=true`. The session cookie is `HttpOnly`,
`SameSite=Lax`, lasts 7 days, and is `Secure` whenever `NODE_ENV=production` or `APP_URL` is https.

## Monitoring

- `GET /api/health` answers `{"status":"ok"}` (200) when the app can reach the database and
  `{"status":"unavailable"}` (503) when it cannot. Point an uptime monitor or load balancer at it.
- The server writes one JSON object per line to stdout and stderr, for example
  `{"time":"...","level":"error","event":"billing_subscription_failed","error":"..."}`. Ship them
  to any log collector. Events worth alerting on: `billing_subscription_failed`,
  `scheduled_billing_failed`, `invoice_email_failed`, `quotation_email_failed`,
  `payment_reminder_failed`, `password_reset_email_failed`, `health_check_failed`. A Resend refusal logs its reason, for example
  an unverified sender domain, and never the key.
- Every billing run is stored with its counts and errors. See Billing > Run history.
- Errors shown to users never include database text.

## Backup and recovery

Everything lives in PostgreSQL, so backing up the database backs up the system.

- **Daily backup:** `pg_dump --format=custom --file=brightloop-$(date +%F).dump "$DATABASE_URL"`
  from cron, copied off the machine. Keep at least 14 daily and 12 monthly copies.
- **Better:** continuous archiving (point-in-time recovery) or the managed backups of a hosted
  Postgres, if you use one. That lets you restore to just before a mistake.
- **Restore:** create an empty database, then
  `pg_restore --no-owner --role=brightloop --dbname="$RESTORE_URL" brightloop-YYYY-MM-DD.dump`,
  point `DATABASE_URL` at it and start the app.
- **Test it** once a quarter by restoring into a scratch database and opening the Dashboard.
- **After a restore, run billing.** Billing catches up every period that was missed, and cannot
  bill one twice, so it is safe to press Run billing now straight away.

## Safe retries

- **Billing** can be run any number of times. A repeat creates nothing, because each period can
  be invoiced once (a unique index) and each subscription is billed in its own transaction.
- **Payments** carry a key made when the form loads, so a double click or a retry after a network
  error records one payment.
- **Emails** are recorded only when they succeed, and a failed reminder is recorded as failed, so
  you can retry.

## Rate limiting

Login allows 5 wrong attempts per email and 30 per address in 15 minutes. Forgot-password allows
3 per email and 10 per address in 15 minutes. Sign-up allows 10 per address per hour. The counters
live in the server's memory, so they reset when it restarts, and each server process counts on its
own. That is enough for one server. Run several behind a load balancer and put a shared limiter
(at the proxy, for example) in front.
