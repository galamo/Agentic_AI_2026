---
name: lab_NN demo servers
description: Repo contains small Express/Node demo servers under lab_*/ directories used for teaching or experiments
type: project
---

The repo contains several `lab_NN/` subdirectories (e.g., `lab_28`, `lab_29`) holding small Express/Node demo servers and clients.

**Why:** These look like coursework/lab exercises, so they tend to omit standard hardening (helmet, rate limiting, CORS config, secret management) and sometimes contain placeholder credentials.

**How to apply:** When reviewing files in `lab_*/`, still report missing hardening (helmet, rate limiting, host binding, `x-powered-by`) but mark them at appropriate severity given the demo context. Treat hardcoded secrets as High regardless — they leak into git history even in demos.
