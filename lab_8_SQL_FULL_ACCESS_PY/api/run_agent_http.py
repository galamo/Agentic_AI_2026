#!/usr/bin/env python3
"""
Run the PostgreSQL agent (HTTP MCP) from the command line.
Prerequisites: MCP server running (python -m mcp_server.server_http), OPENAI_API_KEY set.
"""
import asyncio
import os
import sys
from pathlib import Path

# Add lab root so api and mcp_server can be imported
LAB_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LAB_ROOT))

from dotenv import load_dotenv
load_dotenv(LAB_ROOT / ".env")

from api.agents.postgres_agent_http import run_postgres_agent_http

LOG_PREFIX = "[Agent]"


def main():
    question = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "How many tables are in the database?"
    print(f"{LOG_PREFIX} Question:", question)
    print("—" * 50)
    try:
        result = asyncio.run(run_postgres_agent_http(question))
        print("Answer:", result["answer"])
    except Exception as e:
        print(f"{LOG_PREFIX} Error: {e}", file=sys.stderr)
        if "ECONNREFUSED" in str(e) or "Connection refused" in str(e):
            print("Hint: Start the PostgreSQL MCP server: cd mcp_server && python -m mcp_server.server_http", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
