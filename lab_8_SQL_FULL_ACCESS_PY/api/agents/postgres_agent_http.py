"""
PostgreSQL agent: uses MCP over HTTP (Streamable HTTP).
Connects to postgres MCP server at POSTGRES_MCP_URL, gets tools, runs LangChain agent.
"""
import os
from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_mcp_adapters.sessions import create_session, StreamableHttpConnection

POSTGRES_MCP_URL = os.environ.get("POSTGRES_MCP_URL", "http://127.0.0.1:3101/mcp")
# Explicit headers so MCP server transport security accepts the request (avoids 400 Bad Request)
MCP_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}
LOG_PREFIX = "[Agent]"

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


async def run_postgres_agent_http(question: str) -> dict:
    """Run the agent for one question. Creates a new MCP session per call (stateless)."""
    print(f"{LOG_PREFIX} Connecting to MCP at {POSTGRES_MCP_URL}")
    connection = StreamableHttpConnection(
        transport="streamable_http",
        url=POSTGRES_MCP_URL,
        headers=MCP_HEADERS,
    )
    async with create_session(connection) as session:
        print(f"{LOG_PREFIX} Fetching MCP tools...")
        tools = await load_mcp_tools(session=session)
        print(f"{LOG_PREFIX} Got {len(tools)} tool(s):", [getattr(t, "name", t) for t in tools])
        llm = _create_llm()
        graph = create_agent(
            model=llm,
            tools=tools,
            system_prompt=SYSTEM_PROMPT,
            debug=bool(os.environ.get("VERBOSE")),
        )
        inputs = {"messages": [HumanMessage(content=question)]}
        print(f'{LOG_PREFIX} Invoking agent for question: "{question[:60]}{"..." if len(question) > 60 else ""}"')
        result = await graph.ainvoke(inputs)
        messages = result.get("messages") or []
        answer = ""
        if messages:
            last = messages[-1]
            answer = (getattr(last, "content", None) or str(last) or "").strip()
        print(f"{LOG_PREFIX} Agent finished, output length: {len(answer)}")
        return {"answer": answer or "(no response)"}
