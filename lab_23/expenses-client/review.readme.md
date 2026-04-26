# Code Review — expenses-client

> Reviewed: 2026-04-26 | Reviewer: Claude Code | Codebase: React 19 + TypeScript + MUI v6

---

## 🔴 Critical Issues

*No critical issues found.*

---

## 🔴 High Severity Issues

### H-01 — Missing accessible label on hidden file input
**File:** `src/pages/UploadPage.tsx` · Lines 54–60  
**Category:** Accessibility  
The `<input type="file" hidden />` element has no `aria-label` or associated `<label>`. Screen readers cannot discover or announce this control. The drag-and-drop zone has no `role` attribute either, making the entire upload interaction inaccessible.

```tsx
// ❌ Current
<input type="file" hidden ref={fileInputRef} ... />

// ✅ Fix
<input
  type="file"
  hidden
  aria-label="Upload receipt image"
  ref={fileInputRef}
  ...
/>
```

---

### H-02 — HTML entity `&amp;` rendered literally in button text
**File:** `src/pages/UploadPage.tsx` · Line 80  
**Category:** Rendering / Correctness  
JSX does not process HTML entities — `&amp;` renders as the literal string `&amp;` in the browser instead of `&`.

```tsx
// ❌ Current
Analyze &amp; save to database

// ✅ Fix
Analyze & save to database
```

---

## 🟡 Medium Severity Issues

### M-01 — Duplicated PieChart configuration
**File:** `src/pages/ExpensesPage.tsx` · Lines 173–217  
**Category:** Code Quality / Duplication  
The two `<PieChart>` components share identical `margin`, `slotProps`, `series[].innerRadius`, and `series[].paddingAngle` props. Any future change must be made in two places.

```tsx
// ✅ Fix: extract shared config
const PIE_CHART_DEFAULTS = {
  margin: { top: 10, bottom: 60, left: 10, right: 10 },
  slotProps: pieLegendSlotProps,
};
```

---

### M-02 — Duplicated pie-chart data-mapping logic
**File:** `src/pages/ExpensesPage.tsx` · Lines 64–82  
**Category:** Code Quality / Duplication  
Two `useMemo` blocks perform the same `.map((item, i) => ({ id: i, value: item.amount, label: item.label }))` transformation on different datasets.

```tsx
// ✅ Fix: extract helper
const toPieData = (items: { amount: number; label: string }[]) =>
  items.map((item, i) => ({ id: i, value: item.amount, label: item.label }));
```

---

### M-03 — Magic colour array without semantic mapping
**File:** `src/pages/ExpensesPage.tsx` · Line 31–39  
**Category:** Code Quality / Magic Values  
`chartColors` is an array of hex strings with no mapping to category names or the MUI theme palette. When categories change, this silently misaligns.

---

### M-04 — No error boundary for runtime errors
**File:** `src/App.tsx`, `src/main.tsx`  
**Category:** Architecture / Error Handling  
If any child component throws an unhandled error, the entire app goes blank. There is no `<ErrorBoundary>` wrapping routes or the app root.

---

### M-05 — Empty chart state has no ARIA live region
**File:** `src/pages/ExpensesPage.tsx` · Lines 168–171, 196–199  
**Category:** Accessibility  
When filtered data is empty, a fallback text message is displayed but is not wrapped in `role="status"` or `aria-live="polite"`, so screen readers will not announce the state change.

---

### M-06 — Magic epsilon constant unexplained
**File:** `src/data/mockReceipts.ts` · Line 124  
**Category:** Code Quality / Magic Numbers  
`1e-9` is used as a floating-point comparison epsilon with no explanation or named constant.

```ts
// ✅ Fix
const FLOAT_EPSILON = 1e-9;
```

---

### M-07 — ESLint config lacks custom rules
**File:** `eslint.config.js`  
**Category:** Configuration / Code Quality  
The ESLint config uses only `recommended` presets. There are no rules for import ordering, complexity, naming conventions, or unused variables beyond the preset default.

---

### M-08 — Dev server port not environment-overridable
**File:** `vite.config.ts` · Line 7  
**Category:** Configuration  
Port `5230` is hardcoded with no `VITE_PORT` environment variable fallback, preventing easy CI or multi-instance overrides.

---

## 🔵 Low Severity Issues

### L-01 — Non-null assertion on root element without guard
**File:** `src/main.tsx` · Line 13  
**Category:** Error Handling  
`document.getElementById('root')!` crashes with an opaque error if the element is absent. A guard with a meaningful message would aid debugging.

```ts
// ✅ Fix
const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');
```

---

### L-02 — `skipLibCheck: true` silences dependency type errors
**File:** `tsconfig.app.json` · Line 9  
**Category:** Type Safety  
`skipLibCheck` hides type errors from third-party libraries. Acceptable now, but worth documenting as a known trade-off.

---

### L-03 — Business logic co-located with mock data
**File:** `src/data/mockReceipts.ts`  
**Category:** Architecture / Separation of Concerns  
`filterReceipts()`, `aggregateAmountByType()`, and `aggregateAmountByMonth()` live in the same file as hardcoded fixture data. As the app grows, these should move to `src/utils/receipts.ts`.

---

### L-04 — Inconsistent responsive spacing across pages
**File:** `src/pages/UploadPage.tsx`, `src/pages/ExpensesPage.tsx`  
**Category:** Code Quality / Consistency  
Breakpoint spacing values (`xs: 3, sm: 5`, `xs: 2`, etc.) differ between pages without a shared spacing constant.

---

### L-05 — Logo image alt text is empty string
**File:** `src/components/AppLayout.tsx` · Lines 48–51  
**Category:** Accessibility  
`alt=""` marks the logo as decorative. If the logo is the primary brand identifier (and there is no other text branding visible), it should have `alt="Expenses"`.

---

### L-06 — `pieLegendSlotProps` name is opaque
**File:** `src/pages/ExpensesPage.tsx` · Lines 99–104  
**Category:** Code Quality  
The variable name `pieLegendSlotProps` gives no indication that it positions the legend at the bottom-center. A descriptive name or inline comment would improve readability.

---

### L-07 — SVG favicon not integrity-protected
**File:** `index.html` · Line 5  
**Category:** Security (Minor)  
`/expenses-icon.svg` has no Subresource Integrity hash. Negligible risk for a local asset, but worth noting if assets move to a CDN.

---

### L-08 — Heading variant lacks semantic element override
**File:** `src/pages/ExpensesPage.tsx` · Lines 106–107  
**Category:** Accessibility  
`<Typography variant="h4">` renders as a `<h4>` but is visually the primary page heading. The page heading should map to `<h1>` via `component="h1"` for correct outline semantics.

---

## Summary

| Severity | Count | Categories |
|----------|-------|-----------|
| 🔴 Critical | 0 | — |
| 🔴 High | 2 | Accessibility, Rendering |
| 🟡 Medium | 8 | Code Quality, Architecture, Accessibility, Configuration |
| 🔵 Low | 8 | Error Handling, Type Safety, Accessibility, Code Quality |
| **Total** | **18** | |

### Issues by Category

| Category | Count |
|----------|-------|
| Accessibility | 5 |
| Code Quality / Duplication | 4 |
| Architecture | 2 |
| Configuration | 2 |
| Error Handling | 2 |
| Type Safety | 1 |
| Rendering | 1 |
| Security | 1 |

### Top Priorities

1. **Fix `&amp;` → `&`** in UploadPage button text (H-02) — it's a one-line rendering bug.
2. **Add `aria-label`** to hidden file input (H-01) — blocks keyboard/screen-reader users.
3. **Add error boundary** wrapping routes (M-04) — prevents full blank-screen crashes.
4. **Extract duplicated chart config** (M-01, M-02) — reduces maintenance surface.
5. **Add root element guard** in main.tsx (L-01) — improves debugging DX.
