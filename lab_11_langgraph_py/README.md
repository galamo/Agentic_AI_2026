# Lab 11: LangGraph (Python) – Agent-to-Agent Communication

Python version of Lab 11. **Three agents communicating via LangGraph**: a **Researcher** agent, a **Writer** agent, and a **Translator** agent. They share state in a single graph; the Researcher writes `research_notes`, the Writer produces `final_answer`, and the Translator optionally translates it based on `language`.

## Flow

```
user_query → [ResearcherAgent] → research_notes → [WriterAgent] → final_answer → [TranslatorAgent?] (final_answer translated)
```

- **ResearcherAgent**: Takes `user_query` from state, calls the LLM, and writes `research_notes`.
- **WriterAgent**: Reads `user_query` and `research_notes` from state, calls the LLM, and writes `final_answer`.
- **TranslatorAgent**: Reads `final_answer` and `language` from state. If `language` is English, it leaves `final_answer` unchanged; otherwise it translates it.

Communication happens only through the **shared graph state** (no direct agent-to-agent calls). LangGraph runs the nodes in sequence and passes the updated state between them.

## Setup

```bash
cd lab_11_langgraph_py
python -m venv .venv
source .venv/bin/activate   # or: .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Create a `.env` file with your OpenRouter API key:

```
OPENROUTER_API_KEY=sk-...
```

## Run

```bash
python main.py
```

With a custom question:

```bash
python main.py "Why is the sky blue?"
```

With a custom target language (example: Spanish):

```bash
python main.py "Why is the sky blue?" "spanish"
```

## Structure

- `agents/researcher_agent.py` – Researcher agent (reads `user_query`, writes `research_notes`).
- `agents/writer_agent.py` – Writer agent (reads `user_query` + `research_notes`, writes `final_answer`).
- `agents/translator_agent.py` – Translator agent (reads `final_answer` + `language`, writes translated `final_answer`).
- `graph/orchestrator.py` – Builds the LangGraph with `StateGraph`, `TypedDict` state, and edges: `START → researcher → writer → (translator? ) → END`.
- `main.py` – Entry point: creates graph, invokes with `user_query`, prints research notes and final answer.

## Dependencies

- `langgraph` – StateGraph, START, END
- `langchain-openai` – ChatOpenAI (used with OpenRouter base URL)
- `langchain-core` – messages
- `python-dotenv` – env loading
