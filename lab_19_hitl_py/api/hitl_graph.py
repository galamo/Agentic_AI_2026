from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from typing import Any, TypedDict
from uuid import uuid4

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.constants import START
from langgraph.graph import END, StateGraph
from langgraph.types import Command, interrupt

try:
    from langchain_openai import ChatOpenAI
except Exception:  # pragma: no cover
    ChatOpenAI = None  # type: ignore

try:
    from langchain_ollama import ChatOllama
except Exception:  # pragma: no cover
    ChatOllama = None  # type: ignore


class AgentState(TypedDict, total=False):
    question: str
    history: list[dict[str, Any]]

    # Tool planning (made by the planner agent)
    tool_name: str | None
    tool_args: dict[str, Any]

    # Tool execution
    tool_result: str | None

    # Final response
    answer: str | None
    model: str | None


TOOL_NAME = "schedule_lunch"
REQUIRED_TOOL_FIELDS = ["restaurant", "time"]


def _mock_model() -> BaseChatModel:
    """Deterministic mock LLM for running the lab without external keys."""

    class MockLLM:
        def __init__(self) -> None:
            self._model = "mock-llm"

        def invoke(self, messages: list[Any]) -> Any:
            # The last HumanMessage is always the user question.
            question = ""
            for m in reversed(messages):
                if isinstance(m, HumanMessage):
                    question = (m.content or "").strip()
                    break

            if "Return JSON only" in str(messages[0].content if messages else ""):
                # Planner behavior
                if re.search(r"\b(lunch|schedule)\b", question, re.I):
                    restaurant = None
                    time = None

                    # Very lightweight parsing for the mock:
                    # - restaurant: "at <Something>" or "at <Something>." pattern.
                    m_rest = re.search(r"\bat\s+([A-Za-z0-9][A-Za-z0-9 _\\-]{1,40})", question, re.I)
                    if m_rest:
                        restaurant = m_rest.group(1).strip(" .")

                    # - time: "12:30", "6pm", "7 pm", "noon", "midnight"
                    m_time = re.search(
                        r"(\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\bnoon\b|\bmidnight\b|\b\d{1,2}(:\d{2})?\b)",
                        question,
                        re.I,
                    )
                    if m_time:
                        time = m_time.group(1).strip()

                    args: dict[str, Any] = {}
                    if restaurant:
                        args["restaurant"] = restaurant
                    if time:
                        args["time"] = time
                    return type("Resp", (), {"content": json.dumps({"tool_name": TOOL_NAME, "tool_args": args})})

                return type("Resp", (), {"content": json.dumps({"tool_name": None, "tool_args": {}})})

            # Writer behavior
            tool_result = None
            for m in messages:
                if isinstance(m, SystemMessage):
                    # tool_result is embedded into the system prompt by the writer node
                    m_str = str(m.content)
                    if "TOOL_RESULT=" in m_str:
                        after = m_str.split("TOOL_RESULT=", 1)[1]
                        # Only take the first line after TOOL_RESULT= (avoids capturing instructions).
                        tool_result = after.splitlines()[0].strip()
                        break
            if tool_result:
                return type("Resp", (), {"content": f"Okay. {tool_result}\nAnything else?"})
            return type("Resp", (), {"content": f"Mock answer: {question}"})

    return MockLLM()  # type: ignore[return-value]


@lru_cache(maxsize=1)
def _get_llm() -> tuple[BaseChatModel, str]:
    if os.environ.get("LAB19_MOCK_LLM", "0") == "1":
        model = "mock-llm"
        return _mock_model(), model

    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if openrouter_key and ChatOpenAI is not None:
        model_name = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
        llm = ChatOpenAI(
            model=model_name,
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key,
            temperature=0,
        )
        return llm, model_name

    # Fallback: local Ollama.
    if ChatOllama is None:  # pragma: no cover
        raise RuntimeError("No LLM configured. Set LAB19_MOCK_LLM=1 or provide OPENROUTER_API_KEY or Ollama.")

    base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    model_name = os.environ.get("OLLAMA_MODEL", "llama3")
    temperature = float(os.environ.get("OLLAMA_TEMPERATURE", "0"))
    llm = ChatOllama(model=model_name, base_url=base_url, temperature=temperature)
    return llm, model_name


def _format_history(history: list[dict[str, Any]]) -> list[Any]:
    messages: list[Any] = []
    for turn in history:
        role = str(turn.get("role", "")).strip()
        content = str(turn.get("content", "")).strip()
        if not content:
            continue
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))
    return messages


def _extract_json_object(text: str) -> dict[str, Any] | None:
    # Extract first {...} block (best-effort; models sometimes wrap with text).
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


def schedule_lunch(*, restaurant: str, time: str) -> str:
    # Dummy tool body (replace with real integration in the homework).
    return f"Lunch scheduled at '{restaurant}' for '{time}'."


def _planner_node(state: AgentState) -> dict[str, Any]:
    llm, model_name = _get_llm()

    system_prompt = (
        "You are a planner agent.\n"
        "You have access to exactly one tool:\n"
        "- schedule_lunch(restaurant: string, time: string)\n"
        "The user message may include 0, 1, or 2 of the required fields.\n\n"
        "Rules:\n"
        "- If the user wants to schedule lunch, set tool_name to 'schedule_lunch'.\n"
        "- Include ONLY fields that are explicitly present in the user's message.\n"
        "- If a required field is missing, omit that key from tool_args.\n"
        "- If the user does not want lunch scheduling, set tool_name to null and tool_args to {}.\n"
        "- Return JSON only (no markdown).\n"
        "JSON shape: {\"tool_name\": string|null, \"tool_args\": object}\n"
    )

    messages: list[Any] = [SystemMessage(content=system_prompt)]
    messages.extend(_format_history(state.get("history") or []))
    messages.append(HumanMessage(content=state["question"]))

    response = llm.invoke(messages)
    content = getattr(response, "content", "") or ""

    parsed = _extract_json_object(str(content))
    if not parsed or "tool_name" not in parsed:
        # Defensive fallback: don't attempt tools; just answer normally.
        return {"tool_name": None, "tool_args": {}, "model": model_name}

    tool_name = parsed.get("tool_name")
    tool_args = parsed.get("tool_args") if isinstance(parsed.get("tool_args"), dict) else {}
    if tool_name is not None and str(tool_name) != TOOL_NAME:
        tool_name = None
        tool_args = {}

    return {"tool_name": tool_name, "tool_args": tool_args, "model": model_name}


def _tool_executor_node(state: AgentState) -> dict[str, Any]:
    tool_name = state.get("tool_name")
    tool_args = state.get("tool_args") or {}

    if tool_name != TOOL_NAME:
        return {"tool_result": None}

    provided_args = {k: v for k, v in tool_args.items() if v is not None}

    missing_fields = [f for f in REQUIRED_TOOL_FIELDS if f not in provided_args or not str(provided_args.get(f, "")).strip()]
    if missing_fields:
        resume_payload = {
            "type": "missing_tool_params",
            "tool_name": TOOL_NAME,
            "missing_fields": missing_fields,
            "required_fields": REQUIRED_TOOL_FIELDS,
            "provided_args": provided_args,
            "example": {
                "restaurant": provided_args.get("restaurant", "Pizza Place"),
                "time": provided_args.get("time", "12:30"),
            },
        }
        resume_value = interrupt(resume_payload)

        # Normalize resume value into a dict of missing field values.
        if isinstance(resume_value, dict):
            provided_args = {**provided_args, **resume_value}
        else:
            if len(missing_fields) != 1:
                raise ValueError(
                    f"Expected resume_value to be an object for missing_fields={missing_fields!r}, got {type(resume_value)}."
                )
            provided_args[missing_fields[0]] = resume_value

        # Final validation.
        still_missing = [f for f in REQUIRED_TOOL_FIELDS if f not in provided_args or not str(provided_args.get(f, "")).strip()]
        if still_missing:
            raise ValueError(f"Resume value still missing fields: {still_missing!r}")

    result = schedule_lunch(restaurant=str(provided_args["restaurant"]), time=str(provided_args["time"]))
    return {"tool_result": result}


def _writer_node(state: AgentState) -> dict[str, Any]:
    llm, model_name = _get_llm()
    question = state["question"]
    tool_result = state.get("tool_result")
    history = state.get("history") or []

    if tool_result:
        system_prompt = (
            "You are a helpful assistant.\n"
            "The tool was executed successfully.\n"
            f"TOOL_RESULT={tool_result}\n"
            "Write a short confirmation to the user and ask if they want anything else.\n"
        )
    else:
        system_prompt = (
            "You are a helpful assistant.\n"
            "The tool was not used. Answer the user's question normally and concisely."
        )

    messages: list[Any] = [SystemMessage(content=system_prompt)]
    messages.extend(_format_history(history))
    messages.append(HumanMessage(content=question))

    response = llm.invoke(messages)
    content = getattr(response, "content", None)
    answer = content.strip() if isinstance(content, str) else str(content).strip()
    return {"answer": answer, "model": model_name}


def build_hitl_graph():
    checkpointer = InMemorySaver()
    builder = StateGraph(AgentState)

    builder.add_node("planner", _planner_node)
    builder.add_node("tool_executor", _tool_executor_node)
    builder.add_node("writer", _writer_node)

    builder.add_edge(START, "planner")
    builder.add_edge("planner", "tool_executor")
    builder.add_edge("tool_executor", "writer")
    builder.add_edge("writer", END)

    return builder.compile(checkpointer=checkpointer)


# Compile once at import-time.
hitl_graph = build_hitl_graph()

