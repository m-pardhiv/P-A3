# Brightloop Customer Portal

A customer-facing subscription portal: overview, subscriptions, invoices, payment history, account and support.
Customer-only — there are no admin or staff screens.

**Stack:** React 19 · Vite · TypeScript · Tailwind CSS 3 · shadcn/ui-style components (Radix) · Framer Motion · Recharts · React Router · Lucide

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## Preview mode

All data is realistic **sample data** held in memory (`src/api/mock`). Nothing is billed, no payments are processed, and edits last until the page is reloaded. Dates are generated relative to today so the portal always looks current.

Handy things to try:

- `?simulate=error` on any URL (e.g. `/invoices?simulate=error`) makes data loading fail so you can see the error state.
- Change password: the sample current password is `brightloop` (any other value shows the error state).
- Subscription actions follow each plan's permissions: *Workflows* can't be paused, *Priority Support* can't be cancelled, *Insights API* (pending) can only be cancelled, *Forms* (closed) can be renewed.

## Structure

```
src/
  api/            PortalApi contract + in-memory mock (the only data seam)
  components/
    ui/           shadcn-style primitives (button, card, dialog, dropdown, select, table…)
    common/       status badges, stat card, confirm dialog, empty/error states, skeletons
    layout/       app shell, collapsible sidebar, mobile drawer, top bar
    charts/       Recharts bar + line charts
  config/         navigation, company details printed on invoices
  context/        portal data store, toast notifications
  features/       overview, subscriptions, invoices (incl. PDF), account
  lib/            billing maths, formatting, motion presets
  pages/          route components (code-split)
```

## Connecting a backend

Implement the `PortalApi` interface in `src/api/types.ts` (e.g. with `fetch`) and export it as `api` from `src/api/index.ts`. The UI only talks to that interface. A real backend must derive the customer from the session, never from a client-supplied id, so customers can only ever read their own data.

## Design tokens

Palette (from the supplied reference): ember `#E43D12`, raspberry `#D6536D`, blush `#FFA2B6`, amber `#EFB11D`, cream `#EBE9E1`. Defined in `tailwind.config.ts` and `src/index.css`. Filled brand surfaces use slightly deepened gradient stops so white text keeps good contrast.

## Accessibility & motion

`MotionConfig reducedMotion="user"` plus a CSS `prefers-reduced-motion` rule disable movement for users who ask for it. Charts ship a screen-reader data table, dialogs/drawer/menus use Radix focus handling, and status is always conveyed with a text label, not colour alone.
