"""
PostgreSQL agent: uses MCP over stdio (spawns mcp_server as subprocess).
Set POSTGRES_MCP_STDIO_CWD to the lab root (so mcp_server can be found as mcp_server).
"""
import os
import sys
from pathlib import Path

from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_mcp_adapters.sessions import create_session, StdioConnection

# Lab root: parent of api/
LAB_ROOT = Path(__file__).resolve().parent.parent.parent
MCP_STDIO_CWD = os.environ.get("POSTGRES_MCP_STDIO_CWD", str(LAB_ROOT))

SYSTEM_PROMPT = """You are a PostgreSQL expert with full access to the database via tools.
Use the tools to discover schemas and tables when needed, then run SQL to answer the user.
- Prefer list_schemas then list_tables(schema) to see structure; use describe_table(schema, table) for columns.
- Execute queries with sql_execute(sql, params). Use parameterized queries ($1, $2, ...) when you have parameters.
- Answer in natural language based on the results."""


def _create_llm():
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openrouter_key:
        return ChatOpenAI(
            model="openai/gpt-4o-mini",
            temperature=0,
            openai_api_key=openrouter_key,
            openai_api_base="https://openrouter.ai/api/v1",
        )
    if openai_key:
        return ChatOpenAI(model="gpt-4o-mini", temperature=0)
    raise RuntimeError("Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env")


async def run_postgres_agent_stdio(question: str) -> dict:
    """Run the agent for one question using MCP over stdio (spawns mcp_server)."""
    env = {
        **os.environ,
        "PG_HOST": os.environ.get("PG_HOST", "127.0.0.1"),
        "PG_PORT": os.environ.get("PG_PORT", "5434"),
        "PG_USER": os.environ.get("PG_USER", "sso_user"),
        "PG_PASSWORD": os.environ.get("PG_PASSWORD", "sso_pass"),
        "PG_DATABASE": os.environ.get("PG_DATABASE", "sso_db"),
    }
    connection = StdioConnection(
        transport="stdio",
        command=sys.executable,
        args=["-m", "mcp_server.server_stdio"],
        cwd=MCP_STDIO_CWD,
        env=env,
    )
    async with create_session(connection) as session:
        tools = await load_mcp_tools(session=session)
        llm = _create_llm()
        graph = create_agent(
            model=llm,
            tools=tools,
            system_prompt=SYSTEM_PROMPT,
            debug=bool(os.environ.get("VERBOSE")),
        )
        inputs = {"messages": [HumanMessage(content=question)]}
        result = await graph.ainvoke(inputs)
        messages = result.get("messages") or []
        answer = ""
        if messages:
            last = messages[-1]
            answer = (getattr(last, "content", None) or str(last) or "").strip()
        return {"answer": answer or "(no response)"}
