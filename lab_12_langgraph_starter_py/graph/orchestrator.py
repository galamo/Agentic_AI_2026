"""
Orchestrator: builds a LangGraph with a single LLM agent that has tools.
  START → agent (LLM decides when to call fetch_random_users / compute_statistics) → END
"""
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from agents.tool_calling_agent import create_tool_calling_agent_node


class State(TypedDict, total=False):
    user_message: str
    final_answer: str | None
    random_users: list | None
    aggregations: list | None


def create_graph(api_key: str) -> dict:
    agent_node = create_tool_calling_agent_node(api_key)

    def agent_node_fn(state: State) -> dict:
        return agent_node["run"](state)

    builder = StateGraph(State)
    builder.add_node("agent", agent_node_fn)
    builder.add_edge(START, "agent")
    builder.add_edge("agent", END)
    graph = builder.compile()

    def get_info() -> dict:
        return {
            "agents": [agent_node["get_info"]()],
            "flow": "user_message → agent (LLM + tools: fetch_random_users, compute_statistics) → END",
        }

    return {"graph": graph, "get_info": get_info}
