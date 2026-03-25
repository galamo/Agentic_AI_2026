## Lab 19 — HITL with LangGraph (missing tool params)

This lab demonstrates a LangGraph multi-agent system with **human-in-the-loop** support.

When the system wants to run a tool that requires **two parameters** and the first model-provided args are missing one of them, the graph **pauses** via `langgraph.types.interrupt()` and asks you for the missing value. After you provide it, the graph resumes and completes the answer.

### What you can try

1. Start the server:
```bash
cd lab_19_hitl_py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

2. Or use the CLI (recommended for the HITL prompt flow):
```bash
cd lab_19_hitl_py
source .venv/bin/activate
python3 cli.py
```

3. Example prompts:
- `Schedule lunch at Sushi` (missing time -> you will be asked for `time`)
- `Schedule lunch tomorrow 12:30 at Pizza Place` (should succeed in one shot)

### API

- `POST /api/chat` to start a request
- `POST /api/chat/resume` to resume when the graph returns an interrupt

The server uses `thread_id` so interrupts can be resumed in a later request.

