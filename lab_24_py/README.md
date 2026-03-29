# Lab 24 — Room booking chatbot with human-in-the-loop

Same idea as [Lab 22](../lab_22_py/README.md) (LangGraph extraction + Playwright against the local booking UI), but when required booking fields are missing or invalid, the graph **interrupts** so the user can supply them. The React client shows a small form for the missing keys and calls **`POST /api/chat/resume`** with the same `thread_id` and `interrupt_id` (same pattern as Lab 19).

## Runbook

### 1) Booking UI (lab 21)

```bash
cd lab_21_client_only
npm install
npm run dev
```

Booking page: `http://localhost:3333`.

### 2) API

```bash
cd lab_24_py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 3) Chat client

```bash
cd lab_24_py/client
npm install
npm run dev
```

Vite defaults to **port 5174** (Lab 22 uses 5173).

## API

- `GET /health`
- `POST /api/chat` — body: `{ "question", "history"?, "thread_id"? }`  
  Returns `{ "thread_id", "model"?, "answer"?, "interrupt"? }`. If `interrupt` is set, show the form and resume.
- `POST /api/chat/resume` — body: `{ "thread_id", "interrupt_id", "resume_value" }`  
  `resume_value` is an object whose keys are a subset of: `room`, `user_name`, `meeting_description`, `start_datetime_local`.

## Environment

LLM: same as Lab 22 (`OPENROUTER_API_KEY` / Ollama, or `LAB24_MOCK_LLM=1` for a deterministic mock).

Playwright / booking URL:

- `LAB24_BOOKING_URL` (default `http://localhost:3333`)
- `LAB24_PLAYWRIGHT_USER_DATA_DIR`, `LAB24_PLAYWRIGHT_HEADLESS`, `LAB24_PLAYWRIGHT_STATUS_TIMEOUT_S`

## Try it

- Incomplete: `Book tomorrow at 10:00 for Alice: standup` (no room) → assistant asks via interrupt; submit room (and any other missing fields) in the panel.
- Complete: `Book room 3 tomorrow at 10:00 for Alice: Project sync` → books in one shot (no interrupt).

flowchart TD
  START([START]) --> extract_intent[extract_intent]
  extract_intent --> validate_fields[validate_fields]
  validate_fields --> route{_route_after_validate}
  route -->|intent_ok| book[book_room_via_playwright]
  route -->|not ok| human[human_collect]
  human --> validate_fields
  book --> format[format_response]
  format --> END([END])