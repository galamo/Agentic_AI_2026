"""
Tool-calling agent – LLM decides when to call fetch_random_users and compute_statistics.
Uses a manual tool loop with llm.bind_tools(). Tools share state so compute_statistics
uses the users fetched by fetch_random_users.
"""
import json
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from agents.fetch_users_agent import random_users_api
from agents.statistics_agent import StatisticsAgent

SYSTEM_PROMPT = """You are a statistics assistant. You have two tools:

1. fetch_random_users: Fetches random user profiles from an API. Call this first with the number of users the user wants (e.g. 10, 20, 50). Maximum 100.

2. compute_statistics: Computes aggregations on the users you already fetched. You can request "age", "location", and/or "gender". Call this after fetching users.

Decide based on the user's request:
- If they ask for a report or stats, first fetch users (choose a sensible count if not specified, e.g. 20), then compute the statistics they asked for (or age, location, gender if unspecified).
- If they only ask to fetch users, just call fetch_random_users and summarize what you got.
- Always give a short, clear final answer summarizing the results."""

MAX_ITERATIONS = 8


class FetchRandomUsersInput(BaseModel):
    count: int = Field(ge=1, le=100, description="Number of random users to fetch (1-100)")


class ComputeStatisticsInput(BaseModel):
    statistic_types: list[str] = Field(
        description='Which statistics to compute: age, location, gender (one or more)'
    )


def create_tools(shared: dict[str, Any]) -> list[StructuredTool]:
    """Create the two StructuredTools and wire them to shared state.

    The returned tools intentionally share mutable state via the provided `shared`
    dict so that:
    - `fetch_random_users` stores fetched users at `shared["users"]`
    - `compute_statistics` reads `shared["users"]` and stores results at
      `shared["aggregations"]`

    Args:
        shared: Mutable dict used to store intermediate tool outputs across calls.

    Returns:
        A list containing the `fetch_random_users` and `compute_statistics` tools.
    """
    stats_agent = StatisticsAgent()

    def fetch_random_users(count: int) -> str:
        """Fetch random users and cache them for subsequent statistics calls.

        Side effects:
            Writes the fetched user list to `shared["users"]`.

        Args:
            count: Number of users to fetch (validated upstream by tool schema).

        Returns:
            A short, human-readable status message.
        """
        users = random_users_api(count)
        shared["users"] = users
        return f"Fetched {len(users)} random users. You can now call compute_statistics with the statistic types you need (age, location, gender)."

    def compute_statistics(statistic_types: list[str]) -> str:
        """Compute requested aggregations from the last fetched user list.

        This tool depends on `fetch_random_users` having been called first.

        Side effects:
            Writes computed aggregations to `shared["aggregations"]`.

        Args:
            statistic_types: One or more statistic types (e.g., age/location/gender).

        Returns:
            A JSON string containing aggregations, or an error/help message if no
            users are loaded yet.
        """
        users = shared.get("users") or []
        if not users:
            return "No users loaded. Call fetch_random_users first with a count, then call compute_statistics again."
        aggregations = stats_agent.compute_aggregations(users, statistic_types)
        shared["aggregations"] = aggregations
        return json.dumps(aggregations, indent=2)

    fetch_tool = StructuredTool.from_function(
        name="fetch_random_users",
        description="Fetches random user profiles from the Random User API. Call this first to get user data. Use the count parameter (1-100) for how many users to fetch.",
        func=lambda count: fetch_random_users(count),
        args_schema=FetchRandomUsersInput,
    )
    compute_tool = StructuredTool.from_function(
        name="compute_statistics",
        description="Computes statistics (age buckets, location by country/state, gender) on the users already fetched. Call fetch_random_users first. Choose one or more of: age, location, gender.",
        func=lambda statistic_types: compute_statistics(statistic_types),
        args_schema=ComputeStatisticsInput,
    )
    return [fetch_tool, compute_tool]


def run_tool_loop(
    llm: Any, tools: list[StructuredTool], shared: dict[str, Any], user_message: str
) -> dict[str, Any]:
    """Run an LLM ↔ tools loop until the model stops requesting tool calls.

    The model is invoked with a system prompt plus the user's request. If the
    model returns tool calls, each tool is executed and its output is appended
    as a `ToolMessage`. The loop is capped by `MAX_ITERATIONS` to prevent
    infinite tool-call cycles.

    Args:
        llm: A chat model instance that supports `.invoke(messages)` and tool calls.
        tools: The tools available to the model (must match names used in tool calls).
        shared: Shared mutable state used by tools to store results.
        user_message: The user's request to process.

    Returns:
        A dict with:
        - `final_answer`: The model's final natural-language response (string).
        - `random_users`: The fetched users stored in shared state (if any).
        - `aggregations`: The computed aggregations stored in shared state (if any).
    """
    tools_by_name = {t.name: t for t in tools}
    messages: list[HumanMessage | SystemMessage | AIMessage | ToolMessage] = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ]
    response = None
    iterations = 0

    while iterations < MAX_ITERATIONS:
        response = llm.invoke(messages)
        tool_calls = getattr(response, "tool_calls", None) or []
        if not tool_calls:
            break
        messages.append(response)
        for tc in tool_calls:
            name = tc.get("name", "")
            args = tc.get("args") or {}
            tool_call_id = tc.get("id", f"call_{name}_{iterations}")
            tool = tools_by_name.get(name)
            if tool:
                try:
                    content = tool.invoke(args)
                    if not isinstance(content, str):
                        content = json.dumps(content)
                except Exception as e:
                    content = f"Error: {e}"
            else:
                content = f"Unknown tool: {name}"
            messages.append(ToolMessage(content=content, tool_call_id=tool_call_id))
        iterations += 1

    final_content = getattr(response, "content", "") if response else ""
    final_answer = (final_content.strip() if isinstance(final_content, str) else str(final_content)) or "(No response)"
    return {
        "final_answer": final_answer,
        "random_users": shared.get("users"),
        "aggregations": shared.get("aggregations"),
    }


def create_tool_calling_agent_node(api_key: str) -> dict[str, Any]:
    """Construct a runnable node that wraps the tool-calling agent behavior.

    This function:
    - Initializes shared state for users and aggregations
    - Builds tools bound to that shared state
    - Creates an OpenAI-compatible chat model (via OpenRouter) and binds tools
    - Returns callables (`run`, `get_info`) suitable for use by the orchestrator

    Args:
        api_key: API key used to authenticate requests to the model provider.

    Returns:
        A node-like dict with keys:
        - `run(state)`: executes the agent given an input state dict
        - `get_info()`: returns basic metadata about the node
    """
    shared: dict[str, Any] = {"users": None, "aggregations": None}
    tools = create_tools(shared)
    llm = ChatOpenAI(
        # OpenRouter uses OpenAI-compatible APIs but requires its own base_url and model ids.
        model="openai/gpt-4o-mini",
        temperature=0.2,
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            # Optional but recommended by OpenRouter for attribution/analytics.
            # Safe defaults; override via env if you want.
            "HTTP-Referer": "http://localhost",
            "X-Title": "lab_12_langgraph_starter_py",
        },
    ).bind_tools(tools)

    def run(state: dict) -> dict[str, Any]:
        """Execute one end-to-end request using the tool loop.

        Expects `state["user_message"]` to contain the user's prompt. If absent,
        a sensible default prompt is used. Shared state is reset at the start of
        each run to avoid leaking results across invocations.

        Args:
            state: Input state dict, typically containing `user_message`.

        Returns:
            The structured result produced by `run_tool_loop`.
        """
        user_message = state.get("user_message") or "Fetch 20 random users and compute statistics by age, location, and gender."
        shared["users"] = None
        shared["aggregations"] = None
        return run_tool_loop(llm, tools, shared, user_message)

    def get_info() -> dict:
        """Return a minimal descriptor for UI/logging/registry usage."""
        return {
            "name": "ToolCallingAgent",
            "role": "LLM agent that decides when to fetch users and compute statistics via tools",
        }

    return {"run": run, "get_info": get_info}
