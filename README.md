# Brightloop subscriptions

One platform for Brightloop Software's products, plans, quotations, subscriptions, recurring
invoices, payments, discounts and finance reporting, with admin, staff and customer portal access.

Built with TanStack Start, Drizzle ORM, Tailwind CSS and Supabase Postgres.

## Setup

You need Node 24, pnpm and a Supabase project.

```sh
pnpm install
cp .env.example .env    # then set DATABASE_URL
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open <http://localhost:3000>.

`DATABASE_URL` is the Session pooler URI from Supabase, under Project > Connect. It uses port 5432.
The direct connection host is IPv6-only on the free plan.

## Demo accounts

The password for every account is `Brightloop@2026`.

| Role     | Email                                                           |
| -------- | --------------------------------------------------------------- |
| Admin    | `admin@brightloop.example`                                      |
| Staff    | `staff@brightloop.example`                                      |
| Customer | `asha@`, `vikram@`, `neha@`, `arjun@`, `priya@customer.example` |

These passwords are public. Do not seed them into a live database, or change them first.

## Email

With `SMTP_HOST` empty, development prints emails to the server console, including password reset
links. To use Mailpit instead, run `docker compose up -d`, set `SMTP_HOST=localhost`, and read mail
at <http://localhost:8025>. Production needs a real SMTP provider, and reset emails fail without one.

## Scripts

| Command                | What it does                                      |
| ---------------------- | ------------------------------------------------- |
| `pnpm dev`             | Starts the app on port 3000                       |
| `pnpm db:generate`     | Writes a migration from `src/db/schema.ts`        |
| `pnpm db:migrate`      | Applies migrations                                |
| `pnpm db:seed`         | Adds demo data to an empty database               |
| `pnpm db:seed --reset` | Wipes all data and reseeds; refused in production |
| `pnpm test`            | Runs Vitest                                       |
| `pnpm typecheck`       | Runs TypeScript                                   |
| `pnpm lint`            | Runs Biome                                        |

## Assumptions

- Supabase replaces the local Docker Postgres in the original brief, because the app is going live.
  See `docs/WORKING_RULES.md`.
- Supabase is used as Postgres only. Authentication is custom: bcrypt passwords, hashed session and
  reset tokens, and an httpOnly SameSite=Lax cookie.
- Row Level Security is on for every table with no policies. This closes Supabase's Data API. The
  app connects as the table owner, so it is unaffected.
- Sessions last 7 days. Resetting a password signs out all of that user's sessions.
- Business dates follow the Asia/Kolkata calendar, whatever time zone the server runs in.
- `discounts.value` is a whole percent for percent discounts and paise for fixed discounts.
- `discounts.usage_limit` is required, so every discount has a limit.
- `invoices.customer_snapshot` was added to the brief's columns, so old invoices keep the customer
  details they were billed with.
- `invoice_lines` allows negative amounts, because discounts are negative lines.
- `subscriptions.expiry_date` is optional, for open-ended subscriptions.
- Only one active tax rule can be the default, enforced by a partial unique index.
