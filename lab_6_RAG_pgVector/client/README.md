# RAG pgVector – React client

React app that talks to the QA agent API: you type a free-form question about the data in the pgvector database and get an answer.

## Run

1. **Start the API** (from `lab_6_RAG_pgVector/agent`):
   ```bash
   cd agent && npm run start
   ```
   Server runs at `http://localhost:3000`.

2. **Start the client** (from `lab_6_RAG_pgVector/client`):
   ```bash
   cd client && npm install && npm run dev
   ```
   App runs at `http://localhost:5173`. It proxies `/api` to the backend, so requests go to `POST /ask` with `{ "message": "your question" }`.

## Usage

- Type any question about construction/renovation pricing (e.g. “How much to remove a load-bearing wall?”, “Bathroom rough-in cost?”).
- Click **Ask** (or press Enter). The app calls the server, which uses the vector DB and LLM to answer.
- Questions and answers are listed below the form.
