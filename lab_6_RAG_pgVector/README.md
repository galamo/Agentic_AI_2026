# Lab 6: RAG with pgvector

Index constructor pricing (and other TXT files) into a PostgreSQL vector store using pgvector.

## Prerequisites

- Postgres with pgvector running on port **5432** (e.g. `db/docker-compose.yml`: user/password/db = `langchain`).
- OpenAI API key (or OpenRouter) for embeddings.

## RAG pipeline (index only)

The pipeline lives in **`rag-pipeline/`** and only **pushes and indexes** data into the DB.

### Setup

```bash
cd lab_6_RAG_pgVector/rag-pipeline
cp .env.example .env
# Edit .env: set OPENAI_API_KEY=
npm install
```

### Run the indexer

From inside `rag-pipeline/`:

```bash
npm run index
```

or:

```bash
npm run run:index
```

This will:

1. Load all `.txt` files from `rag-pipeline/data/` (e.g. `pricing.txt`).
2. Split them into chunks.
3. Embed with OpenAI and write into the pgvector table `constructor_pricing_vectors` (DB: `langchain` on port 5432).

### Optional env vars

- `DATA_PATH` – folder of TXT files (default: `./data`).
- `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` – Postgres connection (defaults: host 127.0.0.1, port 5432, user/password/db `langchain`).

To re-index from scratch, drop the table (e.g. in psql or pgAdmin) and run `npm run index` again.

## QA agent (separate folder)

The **`agent/`** folder contains a standalone Node.js + LangChain QA agent that queries the same pgvector DB. It is **not** part of the pipeline.

- **CLI (prompt)**: run a question from the command line.
- **HTTP API**: Express server with `POST /ask` to send a message and get an answer.

See **`agent/README.md`** for setup and usage.
