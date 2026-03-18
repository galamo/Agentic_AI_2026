"""
Lab 11: Two agents communicating via LangGraph (Python)

Flow: user_query → ResearcherAgent (research_notes) → WriterAgent (final_answer)

Run: python main.py [optional question]
Requires OPENROUTER_API_KEY in .env or environment.
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from graph.orchestrator import create_graph

api_key = os.environ.get("OPENROUTER_API_KEY")
if not api_key:
    print("MISSING API KEY. Set OPENROUTER_API_KEY in .env or environment.", file=sys.stderr)
    sys.exit(1)

result = create_graph(api_key)
graph = result["graph"]
get_info = result["get_info"]

print("Lab 11 – LangGraph (Python): Researcher ↔ Writer\n")
print("Flow:", get_info()["flow"])
print("Agents:", " → ".join(a["name"] for a in get_info()["agents"]))
print()

user_query = sys.argv[1] if len(sys.argv) > 1 else "What are the main benefits of renewable energy?"
language = sys.argv[2] if len(sys.argv) > 2 else "english"

print("Query:", user_query)
print("Language:", language)
print("Running graph...\n")

try:
    initial_state = {
        "user_query": user_query,
        "research_notes": None,
        "final_answer": None,
        "language": language,
    }
    print("--- Starting graph ---")
    final_state = graph.invoke(initial_state)
    print("--- Research notes ---")
    print(final_state.get("research_notes") or "(none)")
    print("\n--- Final answer ---")
    print(final_state.get("final_answer") or "(none)")
except Exception as e:
    print("Error:", e, file=sys.stderr)
    sys.exit(1)
