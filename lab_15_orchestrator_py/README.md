## Lab 15: Orchestrator + Supervisor Router (Python)

This lab demonstrates a LangGraph workflow with:
- A **supervisor/router agent** that decides which specialized agents to call
- A **vacations agent** that reads from a local vacations data file (location, dates, prices)
- A **weather agent** that calls a free weather API (Open-Meteo) and summarizes the result

### Run
1. Create `lab_15_orchestrator_py/.env` (copy from `.env.example`)
2. Set `OPENROUTER_API_KEY`
3. Install deps:
   - `pip install -r requirements.txt`
4. Run:
   - `python main.py "I want a vacation in Paris around 2026-07-10. Also, should I pack a jacket?"`

### Behavior
- If the question is only about weather, the supervisor calls only the weather agent.
- If the question is only about vacations, the supervisor calls only the vacations agent.
- If the question is complex (both vacations and weather), the supervisor calls **both** agents and then synthesizes a final answer.

### Weather fallback
- If the weather API returns no usable data or fails, the weather agent uses a fallback temperature of `30 C`.

