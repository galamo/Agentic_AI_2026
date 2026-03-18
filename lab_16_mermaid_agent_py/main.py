"""
Lab 16 – Mermaid MCP Agent (Python + LangGraph)

Run:
  python main.py "Draw a flowchart for user login"
"""

from __future__ import annotations

import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from graph.orchestrator import create_graph


def _get_llm_api_key() -> str:
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    return openrouter_key or openai_key or ""


def _load_mermaid_auth_and_url_from_repo_mcp_json() -> tuple[str, str]:
    """
    Fallback: read the Mermaid MCP server config from repo `mcp.json`.
    """
    import json

    lab_dir = os.path.dirname(__file__)
    repo_root = os.path.abspath(os.path.join(lab_dir, ".."))
    mcp_json_path = os.path.join(repo_root, "mcp.json")

    with open(mcp_json_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    server_cfg = (payload.get("mcpServers") or {}).get("mermaid-mcp") or {}
    url = server_cfg.get("url") or "https://mcp.mermaid.ai/mcp"
    headers = server_cfg.get("headers") or {}
    auth = headers.get("Authorization") or ""
    return auth, url


def _require_mermaid_auth() -> str:
    auth = (os.environ.get("MCP_MERMAID_AUTH") or "").strip()
    if auth:
        return auth

    try:
        auth_from_file, _ = _load_mermaid_auth_and_url_from_repo_mcp_json()
        if auth_from_file.strip():
            return auth_from_file.strip()
    except Exception:
        pass

    print("Missing MCP_MERMAID_AUTH (and could not read it from repo mcp.json).", file=sys.stderr)
    sys.exit(1)


def _get_mermaid_url() -> str:
    url = (os.environ.get("MCP_MERMAID_URL") or "").strip()
    if url:
        return url

    try:
        _, url_from_file = _load_mermaid_auth_and_url_from_repo_mcp_json()
        if url_from_file.strip():
            return url_from_file.strip()
    except Exception:
        pass

    return "https://mcp.mermaid.ai/mcp"


def main() -> None:
    mcp_mermaid_auth = _require_mermaid_auth()
    mcp_mermaid_url = _get_mermaid_url()
    llm_api_key = _get_llm_api_key()
    if not llm_api_key:
        print("Missing OPENAI_API_KEY or OPENROUTER_API_KEY in .env", file=sys.stderr)
        sys.exit(1)

    user_message_arg = sys.argv[1] if len(sys.argv) > 1 else None
    user_message = (
        user_message_arg.strip()
        if (user_message_arg and user_message_arg.strip())
        else "Draw a simple Mermaid flowchart for user login (include validation and success/failure paths)."
    )

    result = create_graph(
        mcp_mermaid_url=mcp_mermaid_url,
        mcp_mermaid_auth=mcp_mermaid_auth,
        llm_api_key=llm_api_key,
    )

    graph = result["graph"]
    get_info = result["get_info"]

    print("Lab 16 – Mermaid MCP Agent (Python + LangGraph)\n")
    print("Flow:", get_info()["flow"])
    print("Agent:", ", ".join(a["name"] for a in get_info()["agents"]))
    print()
    print("Request:", user_message)
    print("Running graph...\n")

    initial_state: dict = {
        "user_message": user_message,
        "final_answer": None,
        "mcp_tool_count": None,
        "mcp_tools": None,
    }

    try:
        final_state = asyncio.run(graph.ainvoke(initial_state))
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        sys.exit(130)

    print("--- Final answer ---")
    print(final_state.get("final_answer") or "(no response)")
    if final_state.get("mcp_tool_count") is not None:
        print(
            "\n--- Mermaid MCP tools ---\n"
            f"Count: {final_state.get('mcp_tool_count')}\n"
            f"Tools: {', '.join(final_state.get('mcp_tools') or [])}"
        )


if __name__ == "__main__":
    main()

