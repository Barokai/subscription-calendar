# Maintenance plan

_Written 2026-11-27, after CI was added (Barokai/subscription-calendar#33). Work through the sections in order;
each one is meant to become its own PR._

## 1. Dependency PRs (Renovate)

All six were rebased onto the new CI on 2026-11-27.

| PR | Update | CI | Action |
|---|---|---|---|
| #11 | eslint-config-next 16.4.6 | ✅ | merge |
| #24 | @supabase/ssr ^0.12.0 | ✅ | **check login first**: 0.x minors can break. Open the Netlify deploy preview and test Google login, email login, the auth callback and the allowlist redirect before merging. |
| #25 | @types/node 26 | ✅ | merge if the Node version on Netlify is 26 or newer, otherwise keep @types/node on the runtime's major |
| #29 | react monorepo | ✅ | merge |
| #30 | vitest 5 | ✅ | merge |
| #26 | typescript 7 | ❌ | **blocked**, see below |

Merge them one at a time; Renovate rebases the rest after each merge.

**TypeScript 7 (#26):** lint crashes with `TypeError: Cannot read properties of undefined (reading 'Cjs')`.
typescript-eslint can't load TypeScript 7's new (native) compiler API yet, and the Netlify build fails as well.
Close #26 and hold TypeScript at 6 until typescript-eslint and Next.js support 7:

```json
{
  "packageRules": [
    { "matchPackageNames": ["typescript"], "allowedVersions": "<7" }
  ]
}
```

(add to `renovate.json`; remove the rule once support has landed).

## 2. Bug: click-outside listener can leak

`components/subscription-calendar.tsx`: the detail popups register `handleClickOutside` on `document` from inside
a `setTimeout` (around lines 540 and 616) and try to remove it from within the handler and in an unmount effect.
`handleClickOutside` is a `useCallback` that changes whenever `selectedSubscription`, `selectedIncome` or
`expandedDayIndexes` change, so `removeEventListener` often gets a *different* function than the one that was added.
Old listeners stay attached and run with stale state. ESLint flags this as `react-hooks/immutability`
(the handler is used before it's declared).

Fix: register the listener in an effect that depends on "something is open", and drop the manual add/remove calls:

```tsx
const somethingOpen = selectedSubscription !== null || selectedIncome !== null || expandedDayIndexes.size > 0;

useEffect(() => {
  if (!somethingOpen) return;
  const onClick = (event: globalThis.MouseEvent) => { /* current handleClickOutside body, minus removeEventListener */ };
  // Defer so the click that opened the popup doesn't close it right away.
  const id = setTimeout(() => document.addEventListener("click", onClick), 0);
  return () => {
    clearTimeout(id);
    document.removeEventListener("click", onClick);
  };
}, [somethingOpen, selectedSubscription, selectedIncome, expandedDayIndexes]);
```

Test by hand: open a subscription popup, an income popup and "show more" on a day; click outside, on another
icon, and on the same icon again; switch months while a popup is open.

## 3. React-hooks 7 warnings (11 × `set-state-in-effect`)

`eslint.config.mjs` sets `react-hooks/set-state-in-effect` and `react-hooks/immutability` to `warn` for now.
Grouped by pattern:

| Where | Pattern | Fix |
|---|---|---|
| `hooks/useSubscriptions.ts`, `useIncomes.ts`, `useCreditCards.ts`, `useShares.ts` | `useEffect(() => { load(); }, [load])`; `load` sets `loading` synchronously | Move to a data-fetching layer: TanStack Query (or SWR) gives loading/error/refetch/caching and removes the four hand-written loaders. Smaller alternative: start with `loading: true` as initial state and only set state after the `await`. |
| `components/subscription-calendar.tsx:145` | `lastFetchTime` set when `loading` turns false | Set it inside the data hooks when a load completes (or use the query's `dataUpdatedAt`) |
| `lib/i18n.tsx:48`, `components/settings.tsx:17` | read `localStorage` on mount, then `setState` | `useSyncExternalStore` with a `localStorage` subscription. For the language, consider a cookie so the server already renders the right language (no flash from `en` to `de`). |
| `components/client-calendar-wrapper.tsx:15` | `isClient` flag | `next/dynamic(() => import(...), { ssr: false })` for the calendar, or a `useSyncExternalStore`-based `useIsClient()` |
| `components/debug-info.tsx:140, 199` | window size and debug info copied into state | window size via a resize subscription (`useSyncExternalStore`); debug info derived with `useMemo` instead of state |
| `components/setup-instructions.tsx:34` | props copied into state | the component isn't imported anywhere: delete it (see 4) |

Also: `isMobile` state in `subscription-calendar.tsx` (line 84) is written by a resize effect (around line 759) but
never read. Remove both.

When all are fixed: set both rules back to `"error"` in `eslint.config.mjs`.

## 4. Dead code from the Google Sheets era

`.env.example` already says Sheets is "no longer used":

- `components/setup-instructions.tsx` (225 lines): not imported anywhere, so delete it
- `components/google-sheets-service.ts` (371 lines): not imported anywhere, so delete it
- `components/settings-service.ts`: still used for `loadSettings` / `saveSettings`. Remove the Sheets parts
  (`checkEnvVariables`, `isConnected`, spreadsheet fields in `CalendarSettings`) and keep the rest.
- `.env.example`: drop the legacy Sheets block
- Root `debug.js`, `command.ps1`, `command.sh` (troubleshooting scripts): check whether they still reflect the
  Supabase setup. If not, delete them; otherwise move them to `scripts/`.

## 5. Branches

| Branch | State | Action |
|---|---|---|
| `barokai/project-rethink-strategy` (local) | all 40 commits are in `main` (same patches) | delete |
| `feat/date-and-detail-hanlding` (local, misspelled) | merged | delete |
| `feat/dep-updates` (local) | merged | delete |
| `feat/date-and-detail-handling` (local + GitHub) | merged | delete both |
| `feat/subscription-handling-and-icons` (local + GitHub) | merged | delete both |
| `barokai/fix-income-pivot-occurrences` (GitHub) | squash-merged via #32 | delete |
| `feat/react-native-mvp` (local + GitHub) | 3 WIP commits ("non-working state"), 2025-03 | decide: keep as a tag (`archive/react-native-mvp`) or delete |

Also turn on "Automatically delete head branches" in the GitHub repo settings.

## 6. Smaller items

- `dev` script: `--turbopack` is the default in Next 16 and can go; `--experimental-https -p 443` needs admin
  rights on some systems. Consider port 3000 with HTTPS, and document why HTTPS is needed (OAuth redirect?).
- Agent instructions: move `.github/copilot-instructions.md` to `AGENTS.md` + `CLAUDE.md` (`@AGENTS.md`), like
  the other repos.
- README: mention CI and the `lint` / `typecheck` / `test` scripts.
