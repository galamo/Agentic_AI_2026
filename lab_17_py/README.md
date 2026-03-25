## Lab 17 — Expenses (React + FastAPI + LangGraph extraction + SQL chatbot)

End-to-end mini app: upload a receipt image to a Python API, persist **expenses** in postgress, and browse them in a React + TypeScript client with **filters**, a **table**, and a **pie chart** by expense type.

implement a langgraph multiagent system that support:
first flow when uploading a recipet image it will be inserted into the db postgress

RAG process in langchain that will support the Schema sql as vector and then Create in the UI a chatbot that will be able to quesiton queris about the reciipet DB - sql generator etc..

also support reports page in the client that will show the relevant reports mentionged in the readme.md

so one flow:
upload reciept 
analyze it, and store int he DB the data

int he ui present the dat from the postgress sql query 
and support chat bot using the RAG retriever from from 

use the .env from lab_15





---

### What is already implemented

- **API (FastAPI)**  
  - `POST /api/receipts` — multipart upload; bytes are passed through `api/graph/receipt_chain.py` (LangGraph vision extraction), then parsed fields are persisted to Postgres.  
  - `GET /api/expenses` — list expenses with optional query params: `date_from`, `date_to`, `expense_type` (exact match).  
  - `GET /api/expenses/summary` — totals **grouped by `expense_type`** (same filters as the list), plus `grand_total`.  
  - `POST /api/chat` — schema-as-vector SQL chatbot (generates SELECT SQL, executes it, returns rows + answer).  
  - `GET /api/reports` — deterministic reports (totals by type/date) for the current filters.  
  - `GET /health` — health check.  
  - Database configured via `DATABASE_URL` (defaults to the repo’s local pgvector Postgres container). A few **demo rows** are inserted when the table is empty.

- **Client (Vite + React + TypeScript)**  
  - `/upload` — choose an image and upload it to the API.  
  - `/expenses` — filters (date range + type), **table**, **pie chart** (from `/api/expenses/summary`), and row count / grand total in range.  
  - `/reports` — deterministic reports + a SQL chatbot UI (calls `/api/reports` and `/api/chat`).  
  - Dev server proxies `/api` and `/health` to `http://127.0.0.1:8000`.

---

### Run the lab

**0. Postgres + pgvector**

```bash
cd lab_17_py
docker compose up -d
```

This spins up a local Postgres+pgvector container and initializes the `expenses` table from `schema.sql`.

**1. API**

```bash
cd lab_17_py
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Optional: copy `.env.example` to `.env` and set `OPENROUTER_API_KEY` (and `DATABASE_URL` if needed). Set `PORT` if you do not want port `8000`.

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**2. Client** (second terminal)

```bash
cd lab_17_py/client
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). Keep the API running on port `8000` so the proxy works.

---

### Optional Improvements
1. Store uploaded receipt files on disk/object storage and save the path in `Expense.receipt_filename`.
2. Add pagination for `/api/expenses` once you insert many rows.
3. Make `expense_type` filtering case-insensitive and support partial matches.

---

### Project layout

| Path | Role |
|------|------|
| `api/main.py` | FastAPI app, routes, seed data |
| `api/db.py` | Postgres (SQLAlchemy) engine and session |
| `api/models.py` | `Expense` model: date, type, amount, … |
| `api/graph/receipt_chain.py` | LangGraph receipt extraction pipeline |
| `client/src/pages/UploadPage.tsx` | Receipt upload UI |
| `client/src/pages/ExpensesPage.tsx` | Filters, table, pie chart |

---

### API quick reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/receipts` | Form field `file` — receipt image |
| `GET` | `/api/expenses` | `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&expense_type=` |
| `GET` | `/api/expenses/summary` | Same query params; response: `by_type[]`, `grand_total` |
| `POST` | `/api/chat` | JSON body: `{ question, date_from?, date_to?, expense_type?, limit? }` |
| `GET` | `/api/reports` | Same query params as `/api/expenses` |

---

### Notes

- The upload response includes a JSON-safe `graph_state` so you can debug what the chain returned (binary image data is replaced by a short placeholder string).  
- CORS is open (`*`) for local development only; tighten for production.
