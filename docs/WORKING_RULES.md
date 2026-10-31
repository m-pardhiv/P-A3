# Working rules

## Owner amendment (2026-10-31)

The project owner chose the PostgreSQL service installed on this machine instead of Docker.
Where the rules below conflict with this list, this list wins.

- Database: local PostgreSQL via `DATABASE_URL`, using a dedicated `brightloop` role that owns the
  `brightloop` database. Docker is not needed for the database. Auth stays custom, as specified in
  the build prompt.
- RLS is enabled on every table, with no policies, as defence in depth. Every new table must call
  `.enableRLS()`, and the app role must own its tables.
- Email: SMTP settings come from env vars. Mailpit is an optional local tool, and anything
  deployed needs a real SMTP provider.
- Rule 2 "Offline friendly" still holds for the database. It no longer requires Docker.
- Rule 4 and billing: pure billing rules live in `src/server/domain/billing.ts`, and `runBilling`,
  which needs the database, lives in `src/server/billing-run.ts`.
- Server logic takes the database as a parameter, so tests and the seed use their own connection.
  Tests only run against a database whose name ends in `_test`.

## Rules as given

1. I am the only developer. Commit straight to `main` about every 30 minutes with Conventional
   Commits (`feat:`, `fix:`, `test:`, `docs:`). No PRs, no module ownership questions.
2. Hard constraints:
   - **Dynamic data only:** real local PostgreSQL plus seed scripts. No static JSON for app data.
   - **Responsive, clean UI:** one palette defined once as design tokens, one layout shell,
     consistent spacing, shared components.
   - **Robust validation:** one Zod schema per form/input, shared by client and server, backed by DB
     constraints (unique, check, foreign keys). Field-level error messages in the UI.
   - **Intuitive navigation:** grouped sidebar, active item highlighted, breadcrumbs on detail
     pages, empty states, confirm dialogs on destructive actions.
   - **Offline friendly:** everything runs locally with Docker Compose (Postgres + Mailpit). No
     cloud services, no external APIs, no payment gateway.
   - **No trendy tech for its own sake:** no microservices, queues, Redis, GraphQL or websockets.
3. Choose the simplest approach that works. No abstractions for imaginary future needs.
4. Business logic lives in `src/server/domain/*` as **pure functions** (no framework imports).
   Server functions are thin wrappers that check the role, call domain code and touch the DB.
5. Never call `new Date()` in business logic. Use `clock.today()` from `src/server/clock.ts`.
6. Money is stored as **integer minor units** (paise). Currency INR, formatted with
   `Intl.NumberFormat`. Prices are tax-exclusive; tax is rounded half-up per line. Business dates
   are `date` columns; audit timestamps are `timestamptz`.
7. TanStack Start and Drizzle change fast: **check the installed version's docs** before using an
   API. Do not rely on memory.
8. A phase is finished only when the app runs, typecheck and lint pass, you have actually loaded the
   affected pages, and the work is committed. Never claim done otherwise.
9. If a requirement is ambiguous, use the default stated in the prompt, record it in `README.md`
   under "Assumptions", and keep going.
10. After each part, explain to me in about 10 lines what you built, why, and where the key logic
    lives.
