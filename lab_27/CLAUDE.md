# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Server (runs on http://localhost:3001)
```bash
cd server && npm run dev      # development with hot reload (ts-node-dev)
cd server && npm run build    # compile TypeScript to dist/
cd server && npm start        # run compiled JS
```

### Client (runs on http://localhost:5173)
```bash
cd client && npm run dev      # Vite dev server
cd client && npm run build    # tsc + vite build
```

No test suite is configured.

## Architecture

**Full-stack TypeScript** app — React client + Express server — with no database. All state lives in two JSON files: `server/data/bookings.json` and `server/data/issues.json`.

### Data flow
- Client makes all API calls through `client/src/api/index.ts` (axios, baseURL `/api`)
- Vite proxies `/api` → `localhost:3001` in dev; in production the client would need a separate reverse proxy
- Server exposes REST endpoints in a single file: `server/src/index.ts`
- Courts are **hardcoded** in `COURTS` array in `server/src/index.ts` — no court CRUD endpoints exist

### Shared types
`client/src/types/index.ts` defines `Court`, `Booking`, `BookingResponse`, `Issue`, `COURT_COLORS`, and `COURT_CHART_COLORS`. These must stay in sync with the server-side interfaces in `server/src/index.ts`.

### Key constraints
- Bookings are valid 8:00–22:00, minimum 1 hour, conflict-checked server-side
- Issues support statuses: `open` | `in-progress` | `resolved`
- Court `colorKey` values (`blue`, `clay`, `grass`, `teal`) are used as keys into `COURT_COLORS` throughout the UI — changing a court's `colorKey` requires updating that map
- Image uploads in issue reports are stored as base64 in the JSON file (can grow large)
