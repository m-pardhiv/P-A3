# Working rules

## Owner amendment (2026-10-31)

The project owner moved the database to Supabase because the app is going live. Where the rules
below conflict with this list, this list wins.

- Database: hosted Supabase Postgres via `DATABASE_URL`, not local Docker Postgres. Supabase is used
  as Postgres only. Auth stays custom, as specified in the build prompt.
- RLS is enabled on every table, with no policies, because Supabase exposes `public` through its
  Data API. Every new table must call `.enableRLS()`.
- Email: SMTP settings come from env vars. Mailpit is an optional local tool, and live needs a real
  SMTP provider.
- Rule 2 "Offline friendly" no longer applies to the database or to email.

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
