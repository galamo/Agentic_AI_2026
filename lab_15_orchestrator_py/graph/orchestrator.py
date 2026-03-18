"""
LangGraph orchestrator with a supervisor router.

Workflow:
START
  -> supervisor_router (decide: vacations | weather | both)
     -> vacations_agent (if route is vacations or both)
         -> (if both) weather_agent
     -> weather_agent (if route is weather)
  -> supervisor_synthesize (produce final answer)
"""

from __future__ import annotations

from typing import Any, Literal, TypedDict

from langgraph.graph import END, START, StateGraph

from agents.supervisor_agent import SupervisorAgent
from agents.vacations_agent import VacationsAgent
from agents.weather_agent import WeatherAgent


class State(TypedDict, total=False):
    user_question: str
    route: Literal["vacations", "weather", "both"] | None
    vacations_result: dict[str, Any] | None
    weather_result: dict[str, Any] | None
    final_answer: str | None


def create_graph(api_key: str) -> dict:
    supervisor = SupervisorAgent(api_key)
    vacations = VacationsAgent()
    weather = WeatherAgent(api_key)

    builder = StateGraph(State)

    def router_node(state: State) -> dict[str, Any]:
        question = state.get("user_question") or ""
        return {"route": supervisor.route(question).get("route")}

    def vacations_node(state: State) -> dict[str, Any]:
        return vacations.run(state)

    def weather_node(state: State) -> dict[str, Any]:
        return weather.run(state)

    def final_node(state: State) -> dict[str, Any]:
        return {
            "final_answer": supervisor.synthesize(
                question=state.get("user_question") or "",
                vacations_result=state.get("vacations_result"),
                weather_result=state.get("weather_result"),
            ).get("final_answer")
        }

    builder.add_node("router", router_node)
    builder.add_node("vacations_agent", vacations_node)
    builder.add_node("weather_agent", weather_node)
    builder.add_node("final", final_node)

    builder.add_edge(START, "router")

    builder.add_conditional_edges(
        "router",
        lambda s: s.get("route"),
        {
            "vacations": "vacations_agent",
            "weather": "weather_agent",
            "both": "vacations_agent",
        },
    )

    # After vacations, either go to weather (if route=="both") or finalize.
    builder.add_conditional_edges(
        "vacations_agent",
        lambda s: "weather_agent" if s.get("route") == "both" else "final",
        {
            "weather_agent": "weather_agent",
            "final": "final",
        },
    )

    builder.add_edge("weather_agent", "final")
    builder.add_edge("final", END)

    graph = builder.compile()

    def get_info() -> dict[str, Any]:
        return {
            "flow": "router -> vacations? -> weather? -> final synthesis",
            "agents": [supervisor.get_info(), vacations.get_info(), weather.get_info()],
        }

    return {"graph": graph, "get_info": get_info}

