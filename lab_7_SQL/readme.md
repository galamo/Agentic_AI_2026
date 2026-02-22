# Lab 7 — SQL Chat with Schema RAG & Multi-Agent Pipeline

Chatbot that answers questions about your SSO database by: **knowing the schema** (RAG over `schema.sql` in pgvector), **generating SQL**, **executing read-only queries**, and **answering in natural language**.

## Architecture

- **Schema Retriever (RAG)**: Indexes `schema.sql` into PostgreSQL (pgvector). For each question, retrieves relevant tables/columns/relations.
- **SQL Generator**: Takes question + schema context → produces a single `SELECT` query.
- **DB Executor**: Runs the query (read-only) and returns rows or error.
- **Answer Agent**: Turns question + results (+ optional SQL) into a natural-language answer.

## Prerequisites

- Docker (for Postgres + pgvector)
- Node 18+
- `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in server `.env`

## Setup

### 1. Start the database

```bash
cd lab_7_SQL
docker compose up -d
```

Postgres runs on **port 5433** (to avoid conflict with other labs). DB: `sso_db`, user: `sso_user`, password: `sso_pass`.

### 2. Load schema and data

```bash
# From project root or lab_7_SQL
docker exec -i lab7-sql-postgres psql -U sso_user -d sso_db < lab_7_SQL/schema.sql
docker exec -i lab7-sql-postgres psql -U sso_user -d sso_db < lab_7_SQL/data.sql
```

Or from inside the container:

```bash
docker exec -it lab7-sql-postgres psql -U sso_user -d sso_db -f /path/to/schema.sql
```

(If you mount `lab_7_SQL` into the container you can use a path there.)

### 3. Server: install deps and index schema

```bash
cd lab_7_SQL/server
cp .env.example .env
# Edit .env: set PG_* if needed (defaults use port 5433, sso_db), set OPENAI_API_KEY or OPENROUTER_API_KEY
npm install
npm run index-schema
```

### 4. Run server and client

**Terminal 1 — server**

```bash
cd lab_7_SQL/server
npm start
```

Server: http://localhost:3001

**Terminal 2 — client**

```bash
cd lab_7_SQL/client
npm install
npm run dev
```

Client: http://localhost:5174 (proxies `/query` to the server).

## Usage

Open the client and ask in natural language, e.g.:

- How many users are there?
- List all permissions
- Which users have the admin_users permission?
- Show failed login attempts
- How many active users?

The UI shows the natural-language answer, optional SQL, and result preview.

## Project layout

```
lab_7_SQL/
├── docker-compose.yml   # Postgres (pgvector) + pgAdmin
├── schema.sql           # SSO schema: users, permissions, users_permissions, audit_login
├── data.sql             # Seed data (20+ rows per table)
├── readme.md
├── server/
│   ├── index.js         # Express, POST /query
│   ├── lib/
│   │   ├── db.js        # PG client, read-only execute
│   │   └── schema-vector-store.js
│   ├── scripts/
│   │   └── index-schema.js   # Index schema.sql into pgvector
│   └── agents/
│       ├── schema-retriever.js
│       ├── sql-generator.js
│       ├── db-executor.js
│       └── answer-agent.js
└── client/              # React (Vite) prompt UI
    └── src/
        ├── App.jsx
        └── ...
```

## Security

- The DB executor allows **only SELECT**; other statements are rejected.
- For production, add auth, rate limits, and restrict which tables/columns the agent can query.
