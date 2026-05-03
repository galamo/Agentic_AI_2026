# Lab 29 — Users Dashboard

Full-stack app: React client + FastAPI backend + PostgreSQL database.  
The database is seeded automatically on first run.

```
lab_29/
├── client/          # React + Vite frontend (nginx in Docker)
├── api/             # FastAPI backend
├── db/              # SQL seed script (auto-loaded by Postgres)
└── docker-compose.yml
```

---

## Run with Docker Compose (recommended)

```bash
cd lab_29
docker compose up --build
```

| Service | URL |
|---------|-----|
| Client  | http://localhost:8020 |
| API     | http://localhost:8000/api/users |
| DB      | localhost:5432 |

Stop everything:
```bash
docker compose down          # keep DB volume
docker compose down -v       # also wipe DB data
```

---

## Run locally (without Docker)

### 1 — PostgreSQL

Start a local Postgres instance (or use Docker just for the DB):

```bash
docker run --rm -d \
  --name lab29-db \
  -e POSTGRES_DB=labdb \
  -e POSTGRES_USER=labuser \
  -e POSTGRES_PASSWORD=labpassword \
  -p 5432:5432 \
  -v "$(pwd)/db/init.sql:/docker-entrypoint-initdb.d/init.sql" \
  postgres:16-alpine
```

### 2 — API

```bash
cd api
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

pip install -r requirements.txt

# env vars (default values already match the DB above)
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=labdb
export DB_USER=labuser
export DB_PASSWORD=labpassword

uvicorn main:app --reload --port 8000
```

API is available at http://localhost:8000  
Interactive docs: http://localhost:8000/docs

### 3 — Client

```bash
cd client
npm install
npm run dev
```

Client is available at http://localhost:5173  
Requests to `/api/*` are proxied to the FastAPI server automatically.

---

## Environment variables (API)

| Variable      | Default       | Description        |
|---------------|---------------|--------------------|
| `DB_HOST`     | `localhost`   | Postgres host      |
| `DB_PORT`     | `5432`        | Postgres port      |
| `DB_NAME`     | `labdb`       | Database name      |
| `DB_USER`     | `labuser`     | Database user      |
| `DB_PASSWORD` | `labpassword` | Database password  |
