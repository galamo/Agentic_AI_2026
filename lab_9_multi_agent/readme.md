# Lab 9: Multi-Agent (Router + HTML RAG + SQL Agent)

Two specialized agents, fronted by a router that decides which one handles each user question.

1. **Router agent** – Receives the user question and decides:
   - **html_rag**: Simple/documentation questions → answered via HTML RAG.
   - **sql_agent**: Data/database questions → handled by the SQL agent (create query + run).

2. **HTML RAG agent** – Answers simple questions using retrieved HTML content (e.g. FAQ, docs). Uses `html_vectors` in the DB.

3. **SQL agent** – Same pipeline as Lab 7: schema RAG → generate SQL → execute → natural-language answer.

## Setup

1. Run `docker compose up` (same as Lab 7).
2. From `server/`: `npm install`, then run scripts:
   - `npm run init-db` – load schema + data
   - `npm run index-schema` – index schema for SQL RAG
   - `npm run index-html` – index HTML in `server/content/` for HTML RAG
3. Set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `server/.env`.

## Run

- `npm run start` (default port 3002).
- `POST /query` with body `{ "question": "..." }`. Response includes `route` (`html_rag` or `sql_agent`), `answer`, and for SQL route also `sql`, `rows`, `rowCount`, `error`.

## Adding HTML for RAG

Put `.html` files in `server/content/`. Run `npm run index-html` after adding or changing them.
