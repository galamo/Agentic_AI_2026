# Lab 34 – RAG: Vector vs Graph

A side-by-side comparison of two retrieval strategies on the same small knowledge
base, orchestrated as a single LangGraph:

```
            ┌─► vectorRag  (TF-IDF cosine over raw sentences) ─┐
START ──►   │                                                  │──► comparator ──► END
            └─► graphRag   (LLM → Cypher → Neo4j traversal)  ──┘
```


Both branches use the **same OpenRouter LLM** for answer synthesis. The only
thing that changes is *how the context is fetched*.

## Requirements

- Node.js ≥ 20
- Docker (for Neo4j)
- An OpenRouter API key (https://openrouter.ai)

## Setup

```bash
cp .env.example .env       # then fill in OPENROUTER_API_KEY
npm install
npm run up                 # start Neo4j on bolt://localhost:7687
npm run ingest             # load sentences + graph triples
```

Neo4j Browser is available at http://localhost:7474 (user `neo4j`,
password `neo4jpassword`).

## Ask a question

```bash
npm start -- "Who does Alice report to and where was her boss previously employed?"
```

Or with `node` directly:

```bash
node index.js "What country is Acme Corp ultimately located in?"
```

If you omit the question a default multi-hop one is used.

## Questions that show the difference

| Question                                                                | Winner    | Why                                                                 |
|-------------------------------------------------------------------------|-----------|---------------------------------------------------------------------|
| "Who is Alice's manager?"                                               | Tie       | Single fact, both find it.                                          |
| "Which companies has Bob been associated with?"                         | Graph     | Needs to follow two outgoing edges from `Bob`.                      |
| "Through which chain of relationships is Dana connected to Berlin?"     | Graph     | Multi-hop traversal across `COLLABORATES_WITH → WORKS_AT → HQ → …`. |
| "What is said about Munich?"                                            | Vector    | Lexical match; no relationships needed.                             |

## Layout

```
data/sentences.js          ← shared knowledge base (text + triples)
src/vector-store.js        ← in-memory TF-IDF cosine retriever
src/graph-store.js         ← Neo4j driver wrapper
src/ingest.js              ← loads both stores
src/agents/vector-rag-agent.js
src/agents/graph-rag-agent.js
src/graph/orchestrator.js  ← LangGraph wiring both branches in parallel
index.js                   ← CLI entry
```

## Cleanup

```bash
npm run down       # stop Neo4j, keep data
npm run reset      # stop Neo4j and wipe the volume
```
