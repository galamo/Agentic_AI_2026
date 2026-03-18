"""
Lab 15: Orchestrator + Supervisor Router (Python)
"""

from __future__ import annotations

import json
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from graph.orchestrator import create_graph


def main() -> None:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("MISSING OPENROUTER_API_KEY. Set it in .env or environment.", file=sys.stderr)
        sys.exit(1)

    result = create_graph(api_key)
    graph = result["graph"]
    get_info = result["get_info"]

    print("Lab 15 – Orchestrator + Supervisor Router (Python)\n")
    print("Flow:", get_info()["flow"])
    print("Agents:", " → ".join(a["name"] for a in get_info()["agents"]))
    print()

    user_question = sys.argv[1] if len(sys.argv) > 1 else "I want a vacation in Paris around 2026-07-10. Also, should I pack a jacket?"
    print("Question:", user_question)
    print("\nRunning graph...\n")

    initial_state: dict = {
        "user_question": user_question,
        "route": None,
        "vacations_result": None,
        "weather_result": None,
        "final_answer": None,
    }

    try:
        final_state = graph.invoke(initial_state)
        print("--- Final answer ---")
        print(final_state.get("final_answer") or "(no response)")

        vacations_result = final_state.get("vacations_result")
        if vacations_result is not None:
            print("\n--- Vacations result ---")
            print(json.dumps(vacations_result, indent=2))

        weather_result = final_state.get("weather_result")
        if weather_result is not None:
            print("\n--- Weather result ---")
            print(json.dumps(weather_result, indent=2))
    except Exception as err:
        print("Error:", err, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

