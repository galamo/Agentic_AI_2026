# QA agent (Lab 6)

Standalone Node.js + LangChain agent that queries the **pgvector** table populated by **`rag-pipeline/`**. Same DB, same table (`constructor_pricing_vectors`).

- **CLI**: ask a question from the command line (prompt = CLI args).
- **HTTP**: Express API with `POST /ask` to send a message and get an answer.

## Prerequisites

- Postgres with pgvector running (same as rag-pipeline).
- Data already indexed: run `npm run index` from **`rag-pipeline/`** first.
- `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `.env`.

## Setup

```bash
cd lab_6_RAG_pgVector/agent
cp .env.example .env
# Edit .env: set OPENAI_API_KEY= or OPENROUTER_API_KEY=
npm install
# If you hit peer dependency conflicts: npm install --legacy-peer-deps
```

## CLI (prompt)

Ask a question from the terminal:

```bash
npm run qa -- "What is the price per m² for tile installation?"
```

or:

```bash
node scripts/run-qa-agent.js "How much for bathroom demolition?"
```

## HTTP API (Express)

Start the server:

```bash
npm start
```

Default port: **3000** (override with `PORT` in `.env`).

### Endpoints

- **GET /health** – `{ "status": "ok" }`
- **POST /ask** – body: `{ "message": "your question" }` → response: `{ "answer": "..." }`

Example:

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the price per m² for tile installation?"}'
```

Response:

```json
{ "answer": "According to the pricing reference..." }
```
