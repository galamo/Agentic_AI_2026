# Lab 11: LangGraph – Agent-to-Agent Communication

This lab shows **two agents communicating via LangGraph**: a **Researcher** agent and a **Writer** agent. They share state in a single graph; the Researcher writes `researchNotes`, and the Writer reads them and produces `finalAnswer`.

## Flow

```
userQuery → [ResearcherAgent] → researchNotes → [WriterAgent] → finalAnswer
```

- **ResearcherAgent**: Takes `userQuery` from state, calls the LLM, and writes `researchNotes`.
- **WriterAgent**: Reads `userQuery` and `researchNotes` from state, calls the LLM, and writes `finalAnswer`.

Communication happens only through the **shared graph state** (no direct agent-to-agent calls). LangGraph runs the nodes in sequence and passes the updated state between them.

## Setup

```bash
cd lab_11_langgraph
npm install
```

Create a `.env` file with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

## Run

```bash
npm start
```

With a custom question:

```bash
node index.js "Why is the sky blue?"
```

## Structure

- `agents/researcher-agent.js` – Researcher agent (reads `userQuery`, writes `researchNotes`).
- `agents/writer-agent.js` – Writer agent (reads `userQuery` + `researchNotes`, writes `finalAnswer`).
- `graph/orchestrator.js` – Builds the LangGraph with `StateGraph`, `Annotation.Root` for state, and edges: `START → researcher → writer → END`.
- `index.js` – Entry point: creates graph, invokes with `userQuery`, prints research notes and final answer.

## Dependencies

- `@langchain/langgraph` – StateGraph, Annotation, START, END
- `@langchain/openai` – ChatOpenAI
- `@langchain/core` – messages
- `dotenv` – env loading
