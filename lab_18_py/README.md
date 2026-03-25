## Lab 18 — Ollama Chatbot (LangGraph + React)

This lab creates a simple chatbot web app:

- **Backend (FastAPI)**: exposes `POST /api/chat` and uses **LangGraph** to orchestrate a single “LLM answer” step.
- **Model**: connected to your locally running **Ollama** instance on `http://localhost:11434` (Ollama default port).
- **Client (React + Vite)**: a minimal chat UI that calls the backend.

The agent is intentionally simple: it only calls the language model and does **not** use tools (no search, no DB queries, etc.).

---

## Run the lab

### 1) API

```bash
cd lab_18_py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Make sure Ollama is running:

```bash
ollama serve
```

And that the model exists locally (examples):

```bash
ollama pull llama3
```

### 2) Client

In a second terminal:

```bash
cd lab_18_py/client
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

---

## Endpoints

- `GET /health` → health check
- `POST /api/chat`
  - Request:
    - `question: string`
    - `history: [{ role: "user"|"assistant", content: string }]` (optional)
  - Response:
    - `answer: string`
    - `model: string`

---

## Environment variables

- `OLLAMA_BASE_URL` (default `http://localhost:11434`)
- `OLLAMA_MODEL` (default `llama3`)
- `OLLAMA_TEMPERATURE` (default `0`)
- `PORT` (default `8000`)

