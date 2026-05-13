---
name: Hardcoded PASSWORD constants in lab demos
description: lab_28/server.js contained a stray hardcoded PASSWORD constant; pattern may recur in sibling labs
type: project
---

`lab_28/server.js` defined `const PASSWORD = "YAKIR_PASSWORD"` at module scope (unused at time of review).

**Why:** Suggests the author drops placeholder credentials directly in source while scaffolding. The value persists in git history even when later removed, and similar patterns are likely in other `lab_*/` servers.

**How to apply:** When reviewing other `lab_*/server.js` or similar files, explicitly grep/scan for hardcoded `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY` style constants. Report as High severity (committed-to-history risk) even if the value looks like a placeholder.
