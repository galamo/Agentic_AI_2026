#!/usr/bin/env python3
"""
Run the PostgreSQL agent (stdio MCP) from the command line.
Spawns mcp_server as subprocess. Requires OPENAI_API_KEY and DB (docker compose).
"""
import asyncio
import sys
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LAB_ROOT))

from dotenv import load_dotenv
load_dotenv(LAB_ROOT / ".env")

from api.agents.postgres_agent_stdio import run_postgres_agent_stdio


def main():
    question = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "List all table names in public schema"
    print("Question:", question)
    print("—" * 50)
    try:
        result = asyncio.run(run_postgres_agent_stdio(question))
        print("Answer:", result["answer"])
    except Exception as e:
        print("Error:", e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
