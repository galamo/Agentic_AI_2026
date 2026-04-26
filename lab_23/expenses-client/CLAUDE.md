# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 5230
npm run build     # Type-check with tsc, then bundle with Vite
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

No test framework is configured.

## Architecture

React 19 + TypeScript SPA built with Vite. UI uses Material-UI v6 throughout (components, icons, charts, date pickers). Routing via React Router v7.

**Entry point:** `src/main.tsx` — wraps app in `BrowserRouter`, MUI `ThemeProvider` (from `src/theme.ts`), `CssBaseline`, and `LocalizationProvider` (dayjs adapter).

**Routes** (defined in `src/App.tsx`):
- `/` → `UploadPage` — receipt image upload (currently mock only, no backend call)
- `/expenses` → `ExpensesPage` — expense list with filters and two MUI `PieChart`s
- `*` → redirects to `/`

All routes render inside `AppLayout`, which provides the persistent sticky AppBar with active-route highlighting.

**State management:** Local `useState`/`useMemo` only — no global store.

**Mock data:** `src/data/mockReceipts.ts` — 12 hardcoded receipt records used by `ExpensesPage`. When a real backend is wired up, this is the file to replace.

**Key utilities in ExpensesPage:** `filterReceipts()`, `aggregateAmountByType()`, `aggregateAmountByMonth()` — pure functions over the receipt array.
