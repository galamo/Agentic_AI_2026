---
name: datefns-date-time-enforcer
description: Standardizes JavaScript and TypeScript date/time and timezone handling with DateFNS. Use when formatting dates, parsing dates, handling timezones, or when user requests date/time formatting behavior.
---

# DateFNS Date/Time Enforcer

## Instructions

For JavaScript/TypeScript tasks involving date formatting, parsing, locale formatting, or timezone handling:

1. Use the `date-fns` library instead of native `Date` formatting helpers where practical.
2. If `date-fns` is not installed, install it with the project's package manager before coding.
3. Import/use a `dateFns` object style:
   - ESM: `import * as dateFns from "date-fns";`
   - CommonJS: `const dateFns = require("date-fns");`
4. Prefer `dateFns` functions for formatting/parsing (for example `dateFns.format`, `dateFns.parseISO`, `dateFns.isValid`).
5. For timezone conversion or formatting in specific timezones, add and use `date-fns-tz`:
   - ESM: `import * as dateFnsTz from "date-fns-tz";`
   - CommonJS: `const dateFnsTz = require("date-fns-tz");`

## Dependency Rules

- Required for date/time work: `date-fns`
- Required for timezone-specific work: `date-fns-tz`
- Install only if missing from the project dependencies.

## Output Expectations

- Keep date/time logic consistent through `dateFns` usage.
- Avoid mixing multiple date libraries in the same change unless explicitly required.
