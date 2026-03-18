"""
Orchestrator: builds a LangGraph where
  START → researcher → writer → END
Agents communicate by reading/writing the shared state.
"""
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from agents.researcher_agent import ResearcherAgent
from agents.writer_agent import WriterAgent
from agents.translator_agent import TranslatorAgent


class State(TypedDict, total=False):
    user_query: str
    research_notes: str | None
    final_answer: str | None
    language: str | None


def create_graph(api_key: str):
    researcher = ResearcherAgent(api_key)
    writer = WriterAgent(api_key)
    translator = TranslatorAgent(api_key)

    def researcher_node(state: State) -> dict:
        return researcher.run(state)

    def writer_node(state: State) -> dict:
        return writer.run(state)

    def translator_node(state: State) -> dict:
        return translator.run(state)

    builder = StateGraph(State)
    builder.add_node("researcher", researcher_node)
    builder.add_node("writer", writer_node)
    builder.add_node("translator", translator_node)
    builder.add_edge(START, "researcher")
    builder.add_edge("researcher", "writer")
    def route_after_writer(s: State) -> str:
        lang = (s.get("language") or "english").strip().lower()
        if lang in {"en", "english", "en_gb", "en-gb"}: 
            return "end"
        return "translator"
    builder.add_conditional_edges(
        "writer",
        route_after_writer,
        {
            "translator": "translator",
            "end": END,
        },
    )

    graph = builder.compile()

    def get_info():
        return {
            "agents": [researcher.get_info(), writer.get_info(), translator.get_info()],
            "flow": "user_query → researcher (research_notes) → writer (final_answer) → translator? (final_answer)",
        }

    return {"graph": graph, "get_info": get_info}
