"""
Orchestrator: builds a LangGraph with a Mermaid MCP tool-calling agent.

Flow:
START -> agent (LLM + Mermaid MCP tools) -> END
"""

from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from agents.mermaid_mcp_tool_calling_agent import create_mermaid_mcp_agent_node


class State(TypedDict, total=False):
    user_message: str
    final_answer: str | None
    mcp_tool_count: int | None
    mcp_tools: list[str] | None


def create_graph(
    *,
    mcp_mermaid_url: str,
    mcp_mermaid_auth: str,
    llm_api_key: str,
) -> dict[str, Any]:
    agent_node = create_mermaid_mcp_agent_node(
        mcp_mermaid_url=mcp_mermaid_url,
        mcp_mermaid_auth=mcp_mermaid_auth,
        llm_api_key=llm_api_key,
    )

    async def agent_node_fn(state: State) -> dict[str, Any]:
        return await agent_node["run"](state)

    builder = StateGraph(State)
    builder.add_node("agent", agent_node_fn)
    builder.add_edge(START, "agent")
    builder.add_edge("agent", END)
    graph = builder.compile()

    def get_info() -> dict[str, Any]:
        return {
            "agents": [agent_node["get_info"]()],
            "flow": "user_message -> agent (LLM tool loop + Mermaid MCP tools) -> END",
        }

    return {"graph": graph, "get_info": get_info}



# curl # https://mcp-for-efrat-only:443/mcp 
# - tools, prompts, resource, initilize/get listOfTools 