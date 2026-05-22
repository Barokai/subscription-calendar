# Copilot Instructions — subscription-calendar

## Project overview

A personal subscription & cash-flow tracker built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS**, backed by **Supabase** (Postgres + Auth), deployed on **Netlify** at `cal.lab404.xyz`.

Users sign in via Google OAuth (email allowlist). A **demo mode** (no login) is always supported — use `?demo=1` or click "Try Demo" on the login page.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS 4 |
| Database / Auth | Supabase (Postgres + RLS + Google OAuth) |
| Icons | `simple-icons` (auto brand icons) |
| Deployment | Netlify |
| Package manager | **bun** — never npm or yarn |
| Tests | Vitest 4 (`vitest.config.mts` — `.mts` extension required) |
| i18n | Custom lightweight context (`lib/i18n.tsx`) |

---

## Commands

```bash
bun run dev        # local dev (HTTPS on :443, requires local Supabase config)
bun run build      # production build — run before every push
bun run test       # run tests (Vitest)
bun run test:watch # watch mode
bun run lint       # ESLint
```

**Always run `bun run build` and `bun run test` before committing.** Both must pass.

---

## Architecture

```
app/                  Next.js App Router pages
  layout.tsx          Root layout — wraps with I18nProvider
  login/page.tsx      Google OAuth login + demo entry
  auth/callback/      Supabase OAuth callback
components/           React components (all "use client")
  subscription-calendar.tsx   Main app shell
  SubscriptionForm.tsx        Add/edit subscriptions
  ImportModal.tsx             CSV import (bank + pivot sheet)
  IncomeManager.tsx           Income sources CRUD
  CashFlowProjection.tsx      12-month cash-flow chart + table
  YearlyProjection.tsx        Cost projection & insights
  MonthlySummaryTable.tsx     Per-day breakdown table
  SubscriptionTrends.tsx      Month-over-month spending trend
  LanguageSwitcher.tsx        DE/EN toggle
lib/
  subscriptions.ts    Subscription CRUD (Supabase)
  incomes.ts          Income CRUD (Supabase)
  csv-import.ts       CSV parser (bank + pivot formats)
  frequency-utils.ts  isPaymentInMonth() and related
  i18n.tsx            I18nProvider, useI18n(), tpl()
  icons.ts            simple-icons lookup
hooks/
  useSubscriptions.ts React hook wrapping lib/subscriptions.ts
  useIncomes.ts       React hook wrapping lib/incomes.ts
locales/
  en.ts               Canonical EN strings + Locale type
  de.ts               DE translations (must satisfy Locale type)
data/
  mock-subscriptions.ts  mockSubscriptions + mockIncomes for demo mode
supabase/
  schema.sql          Full DB schema (run in Supabase SQL editor)
lib/__tests__/
  csv-import.test.ts  66 tests for CSV parsing logic
```

---

## Security — non-negotiable rules

1. **Row Level Security (RLS) is mandatory** on every Supabase table. Every table must have a policy `using (auth.uid() = user_id)`. Never disable RLS.
2. **No secrets in source code.** All keys go in `.env.local` (gitignored). See `.env.example` for required vars.
3. **Google OAuth email allowlist** — controlled via Supabase "Allowed emails" list. Never open public sign-up.
4. **Never expose service-role keys** on the client. Only the anon key goes in `NEXT_PUBLIC_*`.
5. **`"use client"` components never access the Supabase service role.** All DB access is through `createClient()` from `@/lib/supabase/client` (uses anon key + user session).
6. **Validate all user input** before sending to Supabase (amount > 0, day 1–31, required fields).
7. **The start balance in CashFlowProjection is NEVER persisted** — it lives only in component state.

---

## Internationalization (i18n)

- **Default language:** English (`en`).
- **Auto-detection:** `navigator.language.startsWith("de")` → switch to German. Persisted in `localStorage` under key `app_language`.
- **Locale files:** `locales/en.ts` is the canonical source. `locales/de.ts` must satisfy `type Locale = typeof en` — TypeScript enforces completeness.
- **Usage in components:**
  ```tsx
  import { useI18n } from "@/lib/i18n";
  const { t, tpl } = useI18n();
  // static string:  t.nav.signOut
  // template:       tpl(t.cashFlow.negativeWarning, { month: "June" })
  ```
- **Adding a new string:** add to `locales/en.ts` first, then add the German translation to `locales/de.ts`. TypeScript will error if de.ts is incomplete.
- **Never hardcode UI strings** — every user-visible string must go through `t.*`.
- **`userLocale`** (e.g. `"de-AT"`) comes from `useI18n().userLocale` — use it for all `toLocaleString()` calls. Do not maintain a separate `userLocale` state.

---

## Database conventions

- All tables: `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `created_at`, `updated_at`.
- Always add `created_at` / `updated_at` with `not null default now()`.
- Always add the `set_*_updated_at` trigger using `public.handle_updated_at()`.
- Always `grant select, insert, update, delete on public.<table> to authenticated`.
- Always add `create index if not exists <table>_user_id_idx on public.<table>(user_id)`.
- DB column names are **snake_case**. TypeScript interfaces are **camelCase**. Use `fromDb()` / `toDb()` helpers — see `lib/subscriptions.ts` as the canonical pattern.

---

## CRUD pattern

Follow `lib/subscriptions.ts` exactly when adding a new data type:

```
lib/<entity>.ts          — interface, input type, DbRow, fromDb, toDb, CRUD fns
hooks/use<Entity>.ts     — React hook (load/add/update/remove), demo mode support
components/<Entity>Manager.tsx  — UI (uses useI18n, isDarkMode, userLocale props)
data/mock-*.ts           — mock data for demo mode
```

The hook pattern: accept `(demoMode: boolean, mockData: T[])`. In demo mode, use mock data instead of Supabase.

---

## Testing

- Test framework: **Vitest 4**, config in `vitest.config.mts`.
- Tests location: `lib/__tests__/`.
- **Write tests for all pure logic** in `lib/` — especially CSV parsing, frequency utils, date utils.
- Run `bun run test` after every change. All tests must pass before committing.
- Do not add tests for React components unless specifically asked.
- Current baseline: **66 tests in `lib/__tests__/csv-import.test.ts`**.

---

## CSV import

Two supported formats in `lib/csv-import.ts`:

1. **Bank statement** — any CSV with date / description / amount columns. Recurring charges auto-detected.
2. **Pivot sheet** — rows = subscriptions, columns = months. Supports English and German (Austrian) month names, with or without year. Groups/categories supported.

`PivotRow` now includes `hasPriceVariance`, `minAmount`, `maxAmount` — always populate these when building rows. Display a warning badge in the UI for rows where `hasPriceVariance === true`.

Interval/frequency mapping: `Monatlich` → monthly, `Quartal`/`Quarterly` → quarterly, `Jährlich`/`Yearly` → yearly, `Halbjährlich` → biannually, `Wöchentlich` → weekly.

---

## Performance guidelines

- **No unnecessary re-renders.** Use `useCallback` + `useEffect` dependency arrays carefully.
- **Mock data for demo mode** is static — don't re-create arrays on every render (keep in `data/` files, not inline).
- **12-month cash-flow projection** is computed with `useMemo` — keep it that way.
- **Avoid heavy client bundles.** Do not add large dependencies without discussion.
- **`simple-icons` is already included** — use it for brand icons instead of images.

---

## Maintainability

- **One concern per file.** DB logic in `lib/`, state in `hooks/`, UI in `components/`.
- **No prop drilling more than 2 levels.** Prefer context (e.g. `useI18n()`) or co-location.
- **Dark mode** is a prop `isDarkMode: boolean` passed to every component — not a context. Keep it consistent.
- **`userLocale`** (e.g. `"de-AT"`) is a prop to components that need it — comes from `useI18n().userLocale`.
- **Subscription end dates** signal cancellation. Never hard-delete a subscription from the UI — set `endDate` instead (delete is available but the UX should prefer end-dating).
- **Comment only non-obvious logic.** Don't add obvious comments.

---

## Git & PR workflow

- **Always ask for approval before pushing major changes** (new features, schema changes, breaking refactors).
- Branch from `main`. Current working branch: `barokai/project-rethink-strategy`.
- Commit messages: conventional commits style (`feat:`, `fix:`, `chore:`, `docs:`).
- Always include co-author trailer:
  ```
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```
- Before any push: run `bun run build` + `bun run test`. Both must pass.
- Schema changes (`supabase/schema.sql`) must be accompanied by a note in the PR body reminding the reviewer to run the SQL in the Supabase dashboard.
- **Always update the PR description after every push.** The description must include: what changed, any manual steps required (e.g. Supabase SQL to run), and any env vars added. Use `update_pull_request` tool — never leave the PR description stale.

## Next.js 16 notes

- **Proxy file:** In Next.js 16, `middleware.ts` was renamed to `proxy.ts`. The root proxy file is `proxy.ts` — the actual session logic lives in `lib/supabase/middleware.ts` (unchanged). The exported function must be named `proxy`, not `middleware`.
- Do not re-introduce `middleware.ts` — Netlify will crash the edge function if the deprecated name is used.

---

## Environment variables

Required in `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

For local development with Google OAuth, follow the Supabase local dev guide:
https://supabase.com/docs/guides/auth/social-login/auth-google#local-development

Add `http://localhost:3000` (or `https://localhost`) to the Supabase "Redirect URLs" and to the Google Cloud OAuth allowed origins when testing locally.

---

## Demo mode

- Entry: `?demo=1` query param or "Try Demo" button on login.
- All Supabase calls are skipped in demo mode.
- Mock data lives in `data/mock-subscriptions.ts` — exports `mockSubscriptions` and `mockIncomes`.
- **Demo mode must always work** — never break it when adding new features. Add mock data alongside every new data type.
- The `useSubscriptions(demoMode, mockData)` / `useIncomes(demoMode, mockData)` hook pattern handles this automatically.

---

## Features shipped

- ✅ Google OAuth login with email allowlist
- ✅ Subscription CRUD (add / edit / delete / end-date)
- ✅ Monthly calendar view
- ✅ Monthly summary table (by day)
- ✅ Spending trends (month-over-month)
- ✅ Yearly projection & savings insights
- ✅ CSV import — bank statement (auto-detect recurring) + pivot sheet (German/Austrian)
- ✅ Price variance detection in pivot import
- ✅ i18n — EN default, auto-switch to DE based on browser language
- ✅ Income sources (add/edit/delete, stored in Supabase)
- ✅ Cash flow projection (12-month, in-memory start balance)
- ✅ Demo mode (no login required)
- ✅ Dark mode
