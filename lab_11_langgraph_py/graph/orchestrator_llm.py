"""
Orchestrator (LLM-routed): builds a LangGraph where the decision to translate
is made by a model agent (router) instead of hard-coded language checks.

Workflow:
  START → researcher → writer → router → (translator?) → END
"""

from __future__ import annotations

import json
from typing import TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langchain_core.messages import HumanMessage, SystemMessage

from agents.researcher_agent import ResearcherAgent
from agents.writer_agent import WriterAgent
from agents.translator_agent import TranslatorAgent


class State(TypedDict, total=False):
    user_query: str
    research_notes: str | None
    final_answer: str | None
    language: str | None

    # Internal router outputs:
    route: str | None  # "end" | "translator"
    target_language: str | None


def create_graph(api_key: str) -> dict:
    researcher = ResearcherAgent(api_key)
    writer = WriterAgent(api_key)
    translator = TranslatorAgent(api_key)

    router_model = ChatOpenAI(
        model="openai/gpt-4o-mini",
        temperature=0.0,
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

    def researcher_node(state: State) -> dict:
        return researcher.run(state)

    def writer_node(state: State) -> dict:
        return writer.run(state)

    def router_node(state: State) -> dict:
        # The router normalizes the requested language and decides whether translation
        # should run. It must return structural JSON.
        requested = state.get("language") or "english"

        system_prompt = (
            "You are a routing assistant. Decide whether the writer's final_answer should "
            "be translated. Output ONLY valid JSON with this exact schema:\n"
            "{\n"
            '  "route": "end" | "translator",\n'
            '  "target_language": string\n'
            "}\n\n"
            "Rules:\n"
            "- If the requested language is English (including variants like 'en', 'en-us', 'en-gb'),\n"
            "  set route='end' and target_language='english'.\n"
            "- Otherwise set route='translator' and set target_language to the normalized language name\n"
            "  (for example: 'spanish', 'french', 'german', or the closest natural language name).\n"
            "- If the requested language is missing/empty, default to English.\n"
            "- Output JSON only; no backticks; no extra keys."
        )
        user_prompt = f"Requested language: {requested}\n"

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = router_model.invoke(messages)
        content = response.content if isinstance(response.content, str) else str(response.content)

        # Defaults in case the model output is unexpectedly formatted.
        route = "end"
        target_language = "english"

        try:
            parsed = json.loads(content)
            if parsed.get("route") in {"end", "translator"}:
                route = parsed["route"]
            if isinstance(parsed.get("target_language"), str) and parsed["target_language"].strip():
                target_language = parsed["target_language"].strip()
        except Exception:
            # If parsing fails, fall back to English (no translation).
            route = "end"
            target_language = "english"

        # Ensure downstream translator reads the normalized language.
        return {"route": route, "target_language": target_language, "language": target_language}

    def translator_node(state: State) -> dict:
        return translator.run(state)

    builder = StateGraph(State)
    builder.add_node("researcher", researcher_node)
    builder.add_node("writer", writer_node)
    builder.add_node("router", router_node)
    builder.add_node("translator", translator_node)

    builder.add_edge(START, "researcher")
    builder.add_edge("researcher", "writer")
    builder.add_edge("writer", "router")

    builder.add_conditional_edges(
        "router",
        lambda s: s.get("route") or "end",
        {
            "translator": "translator",
            "end": END,
        },
    )

    builder.add_edge("translator", END)

    graph = builder.compile()

    def get_info() -> dict:
        return {
            "agents": [researcher.get_info(), writer.get_info(), translator.get_info()],
            "flow": "user_query → researcher (research_notes) → writer (final_answer) → router? (translator) → END",
        }

    return {"graph": graph, "get_info": get_info}

