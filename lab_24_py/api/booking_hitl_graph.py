"""Lab 24 — LangGraph booking agent with human-in-the-loop for missing fields.

Flow: extract intent → validate → if complete, book via Playwright; otherwise
`interrupt()` so the client can collect missing parameters, then resume and
re-validate until all required fields are present.
"""

from __future__ import annotations

import json
import operator
import os
import re
from functools import lru_cache
from typing import Annotated, Any, Literal, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from api.playwright_booker import book_room_via_playwright

try:
    from langchain_ollama import ChatOllama
except Exception:  # pragma: no cover
    ChatOllama = None  # type: ignore

try:
    from langchain_openai import ChatOpenAI
except Exception:  # pragma: no cover
    ChatOpenAI = None  # type: ignore


BOOKING_FIELD_KEYS = (
    "meeting_description",
    "user_name",
    "room",
    "start_datetime_local",
)


class BookingIntent(TypedDict, total=False):
    meeting_description: str | None
    user_name: str | None
    room: int | None
    start_datetime_local: str | None
    needs_followup: bool
    followup_question: str | None


class BookingHitlState(TypedDict, total=False):
    question: str
    history: Annotated[list[dict[str, Any]], operator.add]
    intent: BookingIntent
    intent_ok: bool
    validation_message: str | None
    missing_field_keys: list[str]
    tool_result: dict[str, Any] | None
    answer: str
    model: str


ROOM_MIN = 1
ROOM_MAX = 10
TIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:00$")


@lru_cache(maxsize=1)
def _get_llm() -> tuple[Any, str]:
    if os.environ.get("LAB24_MOCK_LLM", "0") == "1":

        class MockLLM:
            def invoke(self, messages: list[Any]) -> Any:
                question = ""
                for m in reversed(messages):
                    if isinstance(m, HumanMessage):
                        question = (m.content or "").strip()
                        break

                m_room = re.search(r"\broom\s*(\d{1,2})\b", question, re.I)
                room = int(m_room.group(1)) if m_room else None

                m_time = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", question, re.I)
                start_datetime_local = None
                if m_time:
                    hour = int(m_time.group(1))
                    minute = int(m_time.group(2) or "0")
                    ampm = m_time.group(3)
                    if minute != 0:
                        start_datetime_local = None
                    else:
                        if ampm:
                            ampm = ampm.lower()
                            if ampm == "pm" and hour < 12:
                                hour += 12
                            if ampm == "am" and hour == 12:
                                hour = 0
                        from datetime import datetime

                        now = datetime.now()
                        start_datetime_local = f"{now:%Y-%m-%d}T{hour:02d}:00"

                m_user = re.search(r"\bfor\s+([A-Za-z][A-Za-z0-9 _-]{1,40})\b", question, re.I)
                user_name = m_user.group(1).strip() if m_user else ""

                meeting_description = ""
                if ":" in question:
                    meeting_description = question.split(":", 1)[1].strip()

                needs_followup = not (room and start_datetime_local and user_name and meeting_description)
                followup_question = (
                    "Please specify: room (1-10), a start time on the hour (HH:00), your name, and a brief description."
                )

                payload = {
                    "meeting_description": meeting_description or None,
                    "user_name": user_name or None,
                    "room": room,
                    "start_datetime_local": start_datetime_local,
                    "needs_followup": needs_followup,
                    "followup_question": followup_question,
                }
                return type("Resp", (), {"content": json.dumps(payload)})()

        return MockLLM(), "mock-llm"

    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if openrouter_key and ChatOpenAI is not None:
        model_name = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
        llm = ChatOpenAI(
            model=model_name,
            temperature=0,
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key,
        )
        return llm, model_name

    if ChatOllama is None:  # pragma: no cover
        raise RuntimeError("No LLM configured. Set OPENROUTER_API_KEY or ensure langchain_ollama works.")

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


def _extract_json_from_text(text: str) -> dict[str, Any] | None:
    try:
        return __import__("json").loads(text)
    except Exception:
        pass
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return __import__("json").loads(m.group(0))
    except Exception:
        return None


def _build_system_prompt() -> str:
    return (
        "You are a precise booking assistant.\n"
        "Your job is to extract structured booking fields from a user's chat.\n\n"
        "You MUST return ONLY valid JSON with this schema:\n"
        "{\n"
        '  "meeting_description": string|null,\n'
        '  "user_name": string|null,\n'
        '  "room": number|null,\n'
        '  "start_datetime_local": string|null,\n'
        '  "needs_followup": boolean,\n'
        '  "followup_question": string|null\n'
        "}\n\n"
        "Rules:\n"
        "- A booking must include: room (1-10), your name, a meeting description, and a start time on the hour.\n"
        "- The UI expects `start_datetime_local` in the exact format: YYYY-MM-DDTHH:00 (minutes must be 00).\n"
        "- If the user does not provide a time on the hour (or minutes are not 00), set `needs_followup=true`.\n"
        "- If any required field is missing or invalid, set `needs_followup=true` and ask ONLY for the missing/invalid part.\n"
        "- If the user asks for a room booking, infer missing values from the conversation history when possible.\n"
        "- Do not guess minutes; do not guess a date when the user only gives time.\n"
    )


def _extract_intent_node(state: BookingHitlState) -> dict[str, Any]:
    llm, model_name = _get_llm()
    messages: list[Any] = [SystemMessage(content=_build_system_prompt())]
    messages.extend(_format_history(state.get("history") or []))
    messages.append(HumanMessage(content=state["question"]))

    response = llm.invoke(messages)
    content = getattr(response, "content", "") or ""
    parsed = _extract_json_from_text(str(content))
    if not parsed:
        return {
            "intent": {
                "meeting_description": None,
                "user_name": None,
                "room": None,
                "start_datetime_local": None,
                "needs_followup": True,
                "followup_question": "Please provide room (1-10), start time on the hour (HH:00), your name, and a short meeting description.",
            },
            "intent_ok": False,
            "validation_message": "Could not parse booking details. Please clarify.",
            "model": model_name,
        }

    intent: BookingIntent = {
        "meeting_description": parsed.get("meeting_description") if parsed.get("meeting_description") else None,
        "user_name": parsed.get("user_name") if parsed.get("user_name") else None,
        "room": parsed.get("room") if parsed.get("room") is not None else None,
        "start_datetime_local": parsed.get("start_datetime_local") if parsed.get("start_datetime_local") else None,
        "needs_followup": bool(parsed.get("needs_followup")),
        "followup_question": parsed.get("followup_question") if parsed.get("followup_question") else None,
    }
    return {"intent": intent, "intent_ok": not intent["needs_followup"], "model": model_name}


def _validate_fields_node(state: BookingHitlState) -> dict[str, Any]:
    intent = state.get("intent") or {}
    meeting_description = intent.get("meeting_description")
    user_name = intent.get("user_name")
    room = intent.get("room")
    start_datetime_local = intent.get("start_datetime_local")

    if not isinstance(room, (int, float, str)):
        room = None
    room_int: int | None = None
    try:
        if room is not None and str(room).strip() != "":
            room_int = int(str(room).strip())
    except Exception:
        room_int = None

    if meeting_description is not None and not isinstance(meeting_description, str):
        meeting_description = None
    if user_name is not None and not isinstance(user_name, str):
        user_name = None

    meeting_description = meeting_description.strip() if isinstance(meeting_description, str) else None
    user_name = user_name.strip() if isinstance(user_name, str) else None

    missing_keys: list[str] = []
    human_parts: list[str] = []

    if not meeting_description:
        missing_keys.append("meeting_description")
        human_parts.append("a short meeting description")
    if not user_name:
        missing_keys.append("user_name")
        human_parts.append("your name")
    if room_int is None or not (ROOM_MIN <= room_int <= ROOM_MAX):
        missing_keys.append("room")
        human_parts.append(f"room number ({ROOM_MIN}-{ROOM_MAX})")
    if not start_datetime_local or not isinstance(start_datetime_local, str) or not TIME_RE.match(start_datetime_local):
        missing_keys.append("start_datetime_local")
        human_parts.append("start date and time on the hour (YYYY-MM-DDTHH:00)")

    if missing_keys:
        followup = intent.get("followup_question")
        if not followup or not str(followup).strip():
            followup = "Please provide " + ", ".join(human_parts) + "."
        return {
            "intent_ok": False,
            "validation_message": followup,
            "missing_field_keys": missing_keys,
        }

    return {
        "intent_ok": True,
        "validation_message": None,
        "missing_field_keys": [],
        "intent": {
            "meeting_description": meeting_description,
            "user_name": user_name,
            "room": room_int,
            "start_datetime_local": start_datetime_local,
            "needs_followup": False,
            "followup_question": None,
        },
    }


def _human_collect_node(state: BookingHitlState) -> dict[str, Any]:
    intent = dict(state.get("intent") or {})
    keys = list(state.get("missing_field_keys") or [])
    message = str(state.get("validation_message") or "Please provide the missing booking details.")
    partial = {k: intent.get(k) for k in BOOKING_FIELD_KEYS}

    payload: dict[str, Any] = {
        "type": "missing_booking_params",
        "missing_fields": keys,
        "message": message,
        "partial_intent": partial,
        "hints": {
            "room": f"Integer {ROOM_MIN}-{ROOM_MAX}",
            "start_datetime_local": "Format YYYY-MM-DDTHH:00 (minutes must be 00)",
            "user_name": "Plain text",
            "meeting_description": "Short text",
        },
    }

    resume_value = interrupt(payload)

    merged: dict[str, Any] = {**intent}
    if isinstance(resume_value, dict):
        for k in BOOKING_FIELD_KEYS:
            if k in resume_value and resume_value[k] is not None and str(resume_value[k]).strip() != "":
                merged[k] = resume_value[k]
    elif keys:
        merged[keys[0]] = resume_value

    return {"intent": merged}


async def _book_room_node(state: BookingHitlState) -> dict[str, Any]:
    if not state.get("intent_ok"):
        return {"tool_result": None}

    intent = state.get("intent") or {}
    tool_result = await book_room_via_playwright(
        room=int(intent["room"]),  # type: ignore[arg-type]
        start_datetime_local=str(intent["start_datetime_local"]),
        user_name=str(intent["user_name"]),
        description=str(intent["meeting_description"]),
    )
    return {"tool_result": tool_result}


def _format_response_node(state: BookingHitlState) -> dict[str, Any]:
    if not state.get("intent_ok"):
        msg = str(state.get("validation_message") or "Please clarify your booking details.")
        return {
            "answer": msg,
            "history": [{"role": "assistant", "content": msg}],
        }

    tool_result = state.get("tool_result") or {}
    ui_text = str(tool_result.get("ui_text") or "")
    if not ui_text:
        ui_text = "Booking attempt completed, but the UI returned no message."
    return {
        "answer": ui_text,
        "history": [{"role": "assistant", "content": ui_text}],
    }


def _route_after_validate(state: BookingHitlState) -> Literal["book_room", "human_collect"]:
    if state.get("intent_ok"):
        return "book_room"
    return "human_collect"


def build_booking_hitl_graph(checkpointer: Any) -> Any:
    builder = StateGraph(BookingHitlState)
    builder.add_node("extract_intent", _extract_intent_node)
    builder.add_node("validate_fields", _validate_fields_node)
    builder.add_node("human_collect", _human_collect_node)
    builder.add_node("book_room_via_playwright", _book_room_node)
    builder.add_node("format_response", _format_response_node)

    builder.add_edge(START, "extract_intent")
    builder.add_edge("extract_intent", "validate_fields")
    builder.add_conditional_edges(
        "validate_fields",
        _route_after_validate,
        {"book_room": "book_room_via_playwright", "human_collect": "human_collect"},
    )
    builder.add_edge("human_collect", "validate_fields")
    builder.add_edge("book_room_via_playwright", "format_response")
    builder.add_edge("format_response", END)

    return builder.compile(checkpointer=checkpointer)
