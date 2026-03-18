"""
Lab 14: LangGraph multi-agent + skills – sales proposal pipeline (Python)

Flow: userQuery → Planner → Researcher (company_research) → Qualifier (lead_qualification) → Writer (proposal_draft)
Run: python main.py   or   python main.py "Prepare a proposal for Acme Corp in manufacturing"
Requires OPENROUTER_API_KEY in .env or environment.
"""
import json
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from graph.orchestrator import create_graph

api_key = os.environ.get("OPENROUTER_API_KEY")
if not api_key:
    print("MISSING OPENROUTER_API_KEY. Set it in .env or environment.", file=sys.stderr)
    sys.exit(1)

result = create_graph(api_key)
graph = result["graph"]
get_info = result["get_info"]

print("Lab 14 – LangGraph + Skills: Sales proposal pipeline (Python)\n")
print("Flow:", get_info()["flow"])
print("Agents:", " → ".join(a["name"] for a in get_info()["agents"]))
print()

user_query = sys.argv[1] if len(sys.argv) > 1 else "Prepare a sales proposal for Acme Corp in manufacturing."
print("Query:", user_query)
print("Running graph...\n")

try:
    initial_state = {
        "userQuery": user_query,
        "plan": None,
        "companyResearch": None,
        "leadQualification": None,
        "proposalDraft": None,
    }
    final_state = graph.invoke(initial_state)

    print("--- Plan ---")
    print(json.dumps(final_state.get("plan"), indent=2))
    print("\n--- Company research ---")
    print(json.dumps(final_state.get("companyResearch"), indent=2))
    print("\n--- Lead qualification ---")
    print(json.dumps(final_state.get("leadQualification"), indent=2))
    print("\n--- Proposal draft ---")
    print(final_state.get("proposalDraft") or "(none)")
except Exception as err:
    print("Error:", err, file=sys.stderr)
    sys.exit(1)
