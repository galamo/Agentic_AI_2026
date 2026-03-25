# Lab 22 — Room Booking Chatbot (LangGraph + Playwright)

This lab demonstrates an agentic flow:

1. A React chat UI sends natural-language booking requests to a FastAPI backend.
2. A LangGraph agent extracts meeting description, room, and datetime from the chat.
3. The backend uses Playwright to submit the booking form on the local booking site (`http://localhost:3333`).
4. The booking form’s success/error message is returned back to the chat UI.

## Runbook

### 1) Start the booking UI (local site)
In one terminal:
```bash
cd lab_21_client_only
npm install
npm run dev
```

The booking page runs on `http://localhost:3333`.

### 2) Start the FastAPI backend (LangGraph agent)
In a second terminal:
```bash
cd lab_22_py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Install the Playwright browser (first time only):
```bash
python -m playwright install chromium
```

Run the API:
```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 3) Start the chat client (React)
In a third terminal:
```bash
cd lab_22_py/client
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

---
## Environment variables

### LLM selection (choose one)
Ollama (default):
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_TEMPERATURE=0
```

OpenRouter (optional):
```bash
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

### Booking automation / Playwright
```bash
LAB22_BOOKING_URL=http://localhost:3333
LAB22_PLAYWRIGHT_HEADLESS=1
LAB22_PLAYWRIGHT_USER_DATA_DIR=lab_22_py/.playwright-user-data
LAB22_PLAYWRIGHT_STATUS_TIMEOUT_S=15
```

Notes:
- Playwright uses a persistent browser profile so `localStorage` bookings persist across API calls.
- If you want a “clean slate”, delete the `lab_22_py/.playwright-user-data/` directory.

---
## API
- `GET /health`
- `POST /api/chat` with body: `{ "question": string, "history"?: [{ "role": "user"|"assistant", "content": string }] }`

---
## Try it
Examples you can type into the chat:
- `Book room 3 tomorrow at 10:00 for Alice: Project sync`
- `Book room 3 tomorrow at 10:00 for Alice: Project sync` (repeat to observe the “already booked” UI error)

