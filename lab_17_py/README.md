## Lab 17 — Expenses (React + FastAPI + LangGraph stub)

End-to-end mini app: upload a receipt image to a Python API, persist **expenses** in SQLite, and browse them in a React + TypeScript client with **filters**, a **table**, and a **pie chart** by expense type.

The **LangGraph receipt chain is intentionally a stub** so you can implement vision / OCR / classification yourself.

---

### What is already implemented

- **API (FastAPI)**  
  - `POST /api/receipts` — multipart upload; bytes are passed through `api/graph/receipt_chain.py`, then a row is inserted (currently **placeholder** `expense_type`, `amount`, `expense_date`).  
  - `GET /api/expenses` — list expenses with optional query params: `date_from`, `date_to`, `expense_type` (exact match).  
  - `GET /api/expenses/summary` — totals **grouped by `expense_type`** (same filters as the list), plus `grand_total`.  
  - `GET /health` — health check.  
  - SQLite file: `data/expenses.db` (created on first run). A few **demo rows** are inserted when the table is empty.

- **Client (Vite + React + TypeScript)**  
  - `/upload` — choose an image and upload it to the API.  
  - `/expenses` — filters (date range + type), **table**, **pie chart** (from `/api/expenses/summary`), and row count / grand total in range.  
  - Dev server proxies `/api` and `/health` to `http://127.0.0.1:8000`.

---

### Run the lab

**1. API**

```bash
cd lab_17_py
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Optional: copy `.env.example` to `.env` and set `PORT` if you do not want port `8000`.

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

### Tasks for students

1. **Implement the LangGraph receipt pipeline** in `api/graph/receipt_chain.py`  
   - Extend `ReceiptState` with fields you need (e.g. parsed date, amount, merchant/category).  
   - Replace the stub node with one or more nodes: e.g. vision model, OCR, or tool calls.  
   - Keep the graph **easy to test** (pure state in → state out).

2. **Wire the API to the graph output** in `api/main.py` (`POST /api/receipts`)  
   - Read the **final graph state** and use it to set `Expense.expense_date`, `Expense.expense_type`, and `Expense.amount` instead of the placeholder values.  
   - Handle failures gracefully (invalid image, model error) with HTTP `4xx`/`5xx` and a clear message.

3. **Optional UI improvements** (client)  
   - Show upload progress / errors inline.  
   - After a successful upload, **refresh** the expenses list (or navigate to `/expenses`).  
   - Add pagination or “load more” if you insert many rows.

4. **Optional API improvements**  
   - Partial / case-insensitive match on `expense_type`.  
   - `DELETE` or `PATCH` for an expense by `id`.  
   - Store the uploaded file on disk or object storage and save the path in `receipt_filename`.

---

### Project layout

| Path | Role |
|------|------|
| `api/main.py` | FastAPI app, routes, seed data |
| `api/db.py` | SQLite engine and session |
| `api/models.py` | `Expense` model: date, type, amount, … |
| `api/graph/receipt_chain.py` | **LangGraph stub — you complete this** |
| `client/src/pages/UploadPage.tsx` | Receipt upload UI |
| `client/src/pages/ExpensesPage.tsx` | Filters, table, pie chart |

---

### API quick reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/receipts` | Form field `file` — receipt image |
| `GET` | `/api/expenses` | `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&expense_type=` |
| `GET` | `/api/expenses/summary` | Same query params; response: `by_type[]`, `grand_total` |

---

### Notes

- The upload response includes a JSON-safe `graph_state` so you can debug what the chain returned (binary image data is replaced by a short placeholder string).  
- CORS is open (`*`) for local development only; tighten for production.
