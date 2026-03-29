"""Lab 22 — LangGraph agent for booking intent extraction.

The graph:
1) LLM extracts booking intent from chat into structured JSON.
2) Deterministic validation checks that room/time are acceptable.
3) If valid, calls `book_room_via_playwright()` to attempt the booking on
   the local booking page and returns the UI banner text.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache
from typing import Any, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from api.playwright_booker import book_room_via_playwright
from api.schemas import ChatRequest

try:
    # Preferred for Ollama integrations.
    from langchain_ollama import ChatOllama
except Exception:  # pragma: no cover
    ChatOllama = None  # type: ignore

try:
    from langchain_openai import ChatOpenAI
except Exception:  # pragma: no cover
    ChatOpenAI = None  # type: ignore


class BookingIntent(TypedDict, total=False):
    meeting_description: str | None
    user_name: str | None
    room: int | None
    start_datetime_local: str | None  # YYYY-MM-DDTHH:00
    needs_followup: bool
    followup_question: str | None


class BookingAgentState(TypedDict, total=False):
    question: str
    history: list[dict[str, Any]]

    # LLM extraction:
    intent: BookingIntent

    # Deterministic validation:
    intent_ok: bool
    validation_message: str | None

    # Tool:
    tool_result: dict[str, Any] | None

    # Final response:
    answer: str
    model: str


ROOM_MIN = 1
ROOM_MAX = 10
TIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:00$")


@lru_cache(maxsize=1)
def _get_llm() -> tuple[Any, str]:
    """
    Use Ollama by default; optionally support a mock for classroom demos.

    LAB22_MOCK_LLM=1 will skip LLM calls and attempt a basic regex parse.
    """

    if os.environ.get("LAB22_MOCK_LLM", "0") == "1":

        class MockLLM:
            def invoke(self, messages: list[Any]) -> Any:
                # Find latest user question from messages.
                question = ""
                for m in reversed(messages):
                    if isinstance(m, HumanMessage):
                        question = (m.content or "").strip()
                        break

                # Very lightweight parsing:
                m_room = re.search(r"\broom\s*(\d{1,2})\b", question, re.I)
                room = int(m_room.group(1)) if m_room else None

                # time patterns: "10:00", "10", "10am", "1pm", "tomorrow 10", etc.
                m_time = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", question, re.I)
                start_datetime_local = None
                if m_time:
                    hour = int(m_time.group(1))
                    minute = int(m_time.group(2) or "0")
                    ampm = m_time.group(3)

                    if minute != 0:
                        # In the UI minutes must be 00; require follow-up.
                        start_datetime_local = None
                    else:
                        if ampm:
                            ampm = ampm.lower()
                            if ampm == "pm" and hour < 12:
                                hour += 12
                            if ampm == "am" and hour == 12:
                                hour = 0
                        # Use today's date as a placeholder; validate_fields will
                        # treat this as missing if caller needs a real "tomorrow" mapping.
                        # (Keeping mock simple for workshop purposes.)
                        from datetime import datetime

                        now = datetime.now()
                        start_datetime_local = f"{now:%Y-%m-%d}T{hour:02d}:00"

                # description/user name best-effort:
                m_user = re.search(r"\bfor\s+([A-Za-z][A-Za-z0-9 _-]{1,40})\b", question, re.I)
                user_name = m_user.group(1).strip() if m_user else ""

                # description after colon (if present).
                meeting_description = ""
                if ":" in question:
                    meeting_description = question.split(":", 1)[1].strip()

                needs_followup = not (room and start_datetime_local and user_name and meeting_description)
                followup_question = (
                    "Please specify: room (1-10), a start time on the hour (HH:00), your name, and a brief description."
                )

                return type(
                    "Resp",
                    (),
                    {
                        "content": (
                            "{"
                            f"\"meeting_description\": {meeting_description!r},"
                            f"\"user_name\": {user_name!r},"
                            f"\"room\": {room!r},"
                            f"\"start_datetime_local\": {start_datetime_local!r},"
                            f"\"needs_followup\": {str(needs_followup).lower()},"
                            f"\"followup_question\": {followup_question!r}"
                            "}"
                        )
                    },
                )()

        return MockLLM(), "mock-llm"

    if ChatOllama is None:  # pragma: no cover
        # If Ollama isn't available, we still might be able to use OpenRouter.
        pass

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
    """
    Best-effort extraction of a JSON object in case the model wraps it.
    """
    try:
        # Prefer direct parse if it's already valid JSON.
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
        "  \"meeting_description\": string|null,\n"
        "  \"user_name\": string|null,\n"
        "  \"room\": number|null,\n"
        "  \"start_datetime_local\": string|null,\n"
        "  \"needs_followup\": boolean,\n"
        "  \"followup_question\": string|null\n"
        "}\n\n"
        "Rules:\n"
        "- A booking must include: room (1-10), your name, a meeting description, and a start time on the hour.\n"
        "- The UI expects `start_datetime_local` in the exact format: YYYY-MM-DDTHH:00 (minutes must be 00).\n"
        "- If the user does not provide a time on the hour (or minutes are not 00), set `needs_followup=true`.\n"
        "- If any required field is missing or invalid, set `needs_followup=true` and ask ONLY for the missing/invalid part.\n"
        "- If the user asks for a room booking, infer missing values from the conversation history when possible.\n"
        "- Do not guess minutes; do not guess a date when the user only gives time.\n"
    )


def _extract_intent_node(state: BookingAgentState) -> dict[str, Any]:
    llm, model_name = _get_llm()

    messages: list[Any] = [SystemMessage(content=_build_system_prompt())]
    messages.extend(_format_history(state.get("history") or []))
    messages.append(HumanMessage(content=state["question"]))

    response = llm.invoke(messages)
    content = getattr(response, "content", "") or ""
    parsed = _extract_json_from_text(str(content))
    if not parsed:
        # Force a follow-up request if parsing fails.
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


def _validate_fields_node(state: BookingAgentState) -> dict[str, Any]:
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

    validation_errors: list[str] = []
    if not meeting_description:
        validation_errors.append("meeting description")
    if not user_name:
        validation_errors.append("your name")
    if room_int is None or not (ROOM_MIN <= room_int <= ROOM_MAX):
        validation_errors.append(f"room ({ROOM_MIN}-{ROOM_MAX})")
    if not start_datetime_local or not isinstance(start_datetime_local, str) or not TIME_RE.match(start_datetime_local):
        validation_errors.append("start time on the hour (YYYY-MM-DDTHH:00)")

    if validation_errors:
        followup = intent.get("followup_question")
        if not followup or not str(followup).strip():
            followup = f"Please provide {', '.join(validation_errors)}."

        return {
            "intent_ok": False,
            "validation_message": followup,
        }

    # Normalize:
    return {
        "intent_ok": True,
        "validation_message": None,
        "intent": {
            "meeting_description": meeting_description,
            "user_name": user_name,
            "room": room_int,
            "start_datetime_local": start_datetime_local,
            "needs_followup": False,
            "followup_question": None,
        },
    }


async def _book_room_node(state: BookingAgentState) -> dict[str, Any]:
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


def _format_response_node(state: BookingAgentState) -> dict[str, Any]:
    if not state.get("intent_ok"):
        return {"answer": str(state.get("validation_message") or "Please clarify your booking details.")}

    tool_result = state.get("tool_result") or {}
    ui_text = str(tool_result.get("ui_text") or "")
    if not ui_text:
        ui_text = "Booking attempt completed, but the UI returned no message."
    return {"answer": ui_text}

 
def build_booking_graph():
    builder = StateGraph(BookingAgentState)
    builder.add_node("extract_intent", _extract_intent_node)
    builder.add_node("validate_fields", _validate_fields_node)
    builder.add_node("book_room_via_playwright", _book_room_node)
    builder.add_node("format_response", _format_response_node)

    builder.add_edge(START, "extract_intent")
    builder.add_edge("extract_intent", "validate_fields")

    # If validation fails, we still flow to `format_response` and it will
    # craft a follow-up message.
    builder.add_edge("validate_fields", "book_room_via_playwright")
    builder.add_edge("book_room_via_playwright", "format_response") 
    builder.add_edge("format_response", END)

    return builder.compile()


booking_graph = build_booking_graph()


def run_booking_agent(payload: ChatRequest) -> dict[str, Any]:
    # LangGraph graph execution: prefer async execution for tool nodes.
    # For compatibility with the FastAPI sync route, we run the async graph
    # in a nested event loop.
    try:
        import asyncio

        result = asyncio.run(
            booking_graph.ainvoke(
                {
                    "question": payload.question,
                    "history": [t.model_dump() for t in payload.history],
                }
            )
        )
    except RuntimeError:
        # Fallback for environments that already have an event loop:
        # - We still need correct behavior in that case.
        import asyncio

        loop = asyncio.get_event_loop()
        if loop.is_running():
            # This can happen in some dev servers; in that case, we just
            # run the synchronous path. Tools like Playwright will still
            # be invoked via awaited code paths.
            raise RuntimeError("Async event loop already running; use an async FastAPI endpoint in this lab.")
        result = loop.run_until_complete(
            booking_graph.ainvoke(
                {"question": payload.question, "history": [t.model_dump() for t in payload.history]}
            )
        )

    return {"answer": result.get("answer") or "", "model": result.get("model")}

