"""
Lab 12: LangGraph – LLM tool-calling agent (Python)

Single agent with tools: fetch_random_users, compute_statistics.
The model decides when to call each tool and with what arguments.

Run: python main.py ["your natural language request"]
Example: python main.py "Get 25 users and show me age and gender breakdown"
Default: "Fetch 20 random users and compute statistics by age, location, and gender."

Requires OPENAI_API_KEY in .env.
"""
import json
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from graph.orchestrator import create_graph

api_key = os.environ.get("OPENROUTER_API_KEY")

if not api_key:
    print("Missing OPENROUTER_API_KEY in .env", file=sys.stderr)
    sys.exit(1)

user_message_arg = sys.argv[1] if len(sys.argv) > 1 else None
user_message = (
    user_message_arg.strip() if (user_message_arg and user_message_arg.strip()) else
    "Fetch 20 random users and compute statistics by age, location, and gender."
)

result = create_graph(api_key)
graph = result["graph"]
get_info = result["get_info"]

print("Lab 12 – LangGraph: LLM tool-calling agent (Python)\n")
print("Flow:", get_info()["flow"])
print("Agent:", ", ".join(a["name"] for a in get_info()["agents"]))
print()
print("Request:", user_message)
print("Running graph...\n")

try:
    initial_state: dict = {
        "user_message": user_message,
        "final_answer": None,
        "random_users": None,
        "aggregations": None,
    }
    final_state = graph.invoke(initial_state)

    print("--- Final answer ---")
    print(final_state.get("final_answer") or "(no response)")
    aggregations = final_state.get("aggregations")
    if aggregations:
        print("\n--- Aggregation data (from tools) ---")
        print(json.dumps(aggregations, indent=2))
except Exception as e:
    print("Error:", e, file=sys.stderr)
    sys.exit(1)
