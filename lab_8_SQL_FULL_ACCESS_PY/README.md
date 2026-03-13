# Lab 8 SQL Full Access (Python) — How to run on Mac

Use a virtual environment and run commands from the lab root (`lab_8_SQL_FULL_ACCESS_PY`). All steps assume you are on macOS.

## 1. Create and activate venv (from lab root)

```bash
cd lab_8_SQL_FULL_ACCESS_PY
python3 -m venv .venv
source .venv/bin/activate
```

## 2. Install dependencies

From the lab root with venv active:

```bash
pip install -r requirements.txt
pip install -r mcp_server/requirements.txt
pip install -r api/requirements.txt
```

## 3. Start Postgres (Docker)

```bash
docker compose up -d
```

## 4. Load schema and data (once)

```bash
python scripts/load_schema.py
python scripts/load_data.py
```

## 5. Start the MCP server (HTTP)

In a terminal, with venv active and from the lab root:

```bash
python -m mcp_server.server_http
```

Leave it running (default: `http://127.0.0.1:3101`, endpoint `POST /mcp`).

## 6. Start the API (another terminal)

With venv active and from the lab root:

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 3002
```

API: `http://localhost:3002`.

- **POST /query** — agent uses MCP over HTTP (MCP server must be running).
- **POST /query-stdio** — agent spawns the MCP server as subprocess (no separate MCP process).

## 7. Example request

```bash
curl -X POST http://localhost:3002/query -H "Content-Type: application/json" -d '{"question":"How many users are there?"}'
```

## 8. Run agents from CLI (optional)

**HTTP** (MCP server must be running):

```bash
python api/run_agent_http.py "How many users are in the database?"
```

**Stdio** (spawns MCP server; no separate MCP process):

```bash
python api/run_agent_stdio.py "List all table names in public schema"
```

## Env (optional)

Create a `.env` in the lab root if needed:

- `OPENAI_API_KEY` or `OPENROUTER_API_KEY` — for the agent.
- `PG_HOST`, `PG_PORT` (default `5434`), `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` — Postgres (defaults match docker-compose).
- `MCP_PORT` (default `3101`), `MCP_HOST` (default `127.0.0.1`) — MCP HTTP server.
- `POSTGRES_MCP_URL` (default `http://127.0.0.1:3101/mcp`) — used by the API for `/query`.
- `PORT` (default `3002`) — API server.
- `VERBOSE=1` — enable agent logs.
