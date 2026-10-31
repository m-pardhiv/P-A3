# Brightloop subscriptions

One platform for Brightloop Software's products, plans, quotations, subscriptions, recurring
invoices, payments, discounts and finance reporting, with admin, staff and customer portal access.

Built with TanStack Start, Drizzle ORM, Tailwind CSS and PostgreSQL.

## Setup

You need Node 24, pnpm and PostgreSQL 16 or newer running on this machine.

```sh
pnpm install
psql -U postgres -c "create role brightloop login password 'CHOOSE_A_PASSWORD'" -c "create database brightloop owner brightloop"
cp .env.example .env    # then put the same password in DATABASE_URL
pnpm db:setup           # applies the migrations, then loads the demo data
pnpm dev
```

Open <http://localhost:3000>.

The app connects as `brightloop`, which owns the database, and never as the `postgres` superuser.
Nothing else on the PostgreSQL server is touched.

## Demo accounts

The password for every account is `Brightloop@2026`.

| Role     | Email                                                           |
| -------- | --------------------------------------------------------------- |
| Admin    | `admin@brightloop.example`                                      |
| Staff    | `staff@brightloop.example`                                      |
| Customer | `asha@`, `vikram@`, `neha@`, `arjun@`, `priya@customer.example` |

These passwords are public. Do not seed them into a database other people can reach, or change
them first.

## Email

With `SMTP_HOST` empty, development prints emails to the server console, including password reset
links. To use Mailpit instead, run `docker compose up -d`, set `SMTP_HOST=localhost`, and read mail
at <http://localhost:8025>. With `NODE_ENV=production` and no SMTP provider, reset emails fail.

## Scripts

| Command                | What it does                                      |
| ---------------------- | ------------------------------------------------- |
| `pnpm dev`             | Starts the app on port 3000                       |
| `pnpm db:generate`     | Writes a migration from `src/db/schema.ts`        |
| `pnpm db:migrate`      | Applies migrations                                |
| `pnpm db:setup`        | Runs `db:migrate`, then `db:seed`                 |
| `pnpm db:seed`         | Adds demo data to an empty database               |
| `pnpm db:seed --reset` | Wipes all data and reseeds; refused in production |
| `pnpm test`            | Runs Vitest                                       |
| `pnpm typecheck`       | Runs TypeScript                                   |
| `pnpm lint`            | Runs Biome                                        |

## Assumptions

- The database is PostgreSQL installed on the machine, not Docker Postgres as in the original brief.
  See `docs/WORKING_RULES.md`.
- Authentication is custom: bcrypt passwords, hashed session and reset tokens, and an httpOnly
  SameSite=Lax cookie.
- Row Level Security is on for every table with no policies. The app connects as the table owner, so
  it is unaffected, and any other role is locked out. This is defence in depth.
- Sessions last 7 days. Resetting a password signs out all of that user's sessions.
- Business dates follow the Asia/Kolkata calendar, whatever time zone the server runs in.
- `discounts.value` is a whole percent for percent discounts and paise for fixed discounts.
- `discounts.usage_limit` is required, so every discount has a limit.
- `invoices.customer_snapshot` was added to the brief's columns, so old invoices keep the customer
  details they were billed with.
- `invoice_lines` allows negative amounts, because discounts are negative lines.
- `subscriptions.expiry_date` is optional, for open-ended subscriptions.
- Only one active tax rule can be the default, enforced by a partial unique index.

### Catalogue and subscriptions

- A subscription's first line is the plan's base fee. It has no product, uses the default tax rule,
  and its quantity is the "plan quantity", which must meet the plan's minimum.
- A line's unit price and tax rate are copied when the line is added. Changing a product's price or a
  tax rule later does not change existing lines. Saving a line without changing its product or
  variant keeps its copied values; changing either reprices it.
- Tax is calculated per line and rounded half-up. Prices are tax-exclusive.
- Money is typed in rupees (such as `1200.50`) and stored as integer paise.
- `quotation_valid_until` is set only for subscriptions created from a template (creation date plus
  the template's validity days). A subscription made from scratch has no validity limit.
- Staff and admin can both create and edit templates. Only admin edits products, plans, taxes and
  payment terms; staff see products and plans read-only.
- Moves are defined in one table in `src/server/domain/subscription-state.ts`:
  Draft to Quotation to Confirmed to Active, with Pause and Resume between Active and Paused.
  A subscription can be closed from any state, but a running one (Active or Paused) can only be
  closed before its expiry date if the plan allows early close.
- Activate is a button that works once the start date has arrived. Part 3's billing run will also
  activate confirmed subscriptions whose start date has come.
- Renew is offered on Active and Closed subscriptions, once only, and needs an expiry date. It
  creates a Draft with the same lines, starting the day after expiry and lasting the same number of
  days.
- Closing a subscription clears its next invoice date. Closing at expiry on `auto_close` plans is
  Part 3's job; the rule is `shouldAutoClose` in the state module.
- Only one tax rule can be the default. Saving a new default demotes the old one.
- Inactive products and plans cannot be added to new subscriptions.
- Subscription numbers come from a Postgres sequence, so a failed create can leave a gap.
- The seed adds 16 subscriptions across every status. One quotation is already expired, one plan
  (Launch offer) is past its availability window, and the last draft is a renewal of the closed one.
