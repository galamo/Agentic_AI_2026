# Lab 8: SQL full access via MCP

Same data model as Lab 7, but **no RAG**. The agent has **full access** to PostgreSQL via an **MCP server** that exposes schema introspection and SQL execution.

## Structure

- **mcp-server/** — PostgreSQL MCP server (Streamable HTTP + stdio)
  - Tools: `list_schemas`, `list_tables(schema)`, `describe_table(schema, table)`, `get_create_table(schema, table)`, `sql_execute(sql, params)`
  - Run over HTTP: `npm run start` (default port 3101)
  - Run over stdio: `npm run stdio`
- **api/** — Express API with two agents that use the MCP as tools
  - **postgres_agent (HTTP)** — Connects to MCP at `POSTGRES_MCP_URL` (e.g. remote server)
  - **postgres_agent_stdio** — Spawns `mcp-server/server-stdio.js` and talks via stdin/stdout

## Prerequisites

- Node 18+
- Docker (for Postgres)
- `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `.env` (in api/ and optionally mcp-server/)

## Quick start

1. **Start Postgres** (same schema as lab_7; lab_8 uses port **5434** and **5052** for pgAdmin):

   ```bash
   cd lab_8_SQL_FULL_ACCESS
   docker compose up -d
   ```

2. **Load schema and data** (once):

   ```bash
   cd lab_8_SQL_FULL_ACCESS
   npm install
   npm run load-schema
   npm run load-data
   cd mcp-server && npm install && cd ../api && npm install
   ```

3. **Start the MCP server** (HTTP):

   ```bash
   cd mcp-server
   npm install && npm run start
   ```

   Leave it running. Default: `http://127.0.0.1:3101`, endpoint `POST /mcp`.

4. **Start the API** (in another terminal):

   ```bash
   cd api
   npm install && npm start
   ```

   API: `http://localhost:3002`.  
   - **POST /query** — agent uses MCP over HTTP (MCP server can be remote).  
   - **POST /query-stdio** — agent spawns `mcp-server/server-stdio.js` and uses MCP over stdio.

5. **Example request**:

   ```bash
   curl -X POST http://localhost:3002/query -H "Content-Type: application/json" -d '{"question":"How many users are there?"}'
   ```

## Run agents from CLI

- **HTTP** (MCP server must be running):

  ```bash
  cd api && npm run agent:http -- "How many users are in the database?"
  ```

- **Stdio** (spawns MCP server as subprocess; no separate MCP process):

  ```bash
  cd api && npm run agent:stdio -- "List all table names in public schema"
  ```

## Env vars

- **mcp-server**
  - `PG_HOST`, `PG_PORT` (default 5434), `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` — Postgres connection (defaults match docker-compose).
  - `MCP_PORT` (default 3101), `MCP_HOST` (default 127.0.0.1) — HTTP server.

- **api**
  - `POSTGRES_MCP_URL` — MCP Streamable HTTP URL (default `http://127.0.0.1:3101/mcp`).
  - `POSTGRES_MCP_STDIO_CWD` — Working directory for stdio MCP (default: `../mcp-server` relative to api).
  - `OPENAI_API_KEY` or `OPENROUTER_API_KEY`, `PORT` (default 3002), `VERBOSE` (agent logs).

## Load schema and data

From `lab_8_SQL_FULL_ACCESS` (after `npm install`):

```bash
npm run load-schema
npm run load-data
# or once: npm run init-db
```

Uses lab_8’s `scripts/load-schema.js` and `scripts/load-data.js` (default `PG_PORT=5434`).
