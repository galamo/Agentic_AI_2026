from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

try:
    # Preferred package name (most recent)
    from langchain_ollama import ChatOllama
except Exception:  # pragma: no cover
    # Fallback for older setups
    from langchain_community.chat_models import ChatOllama  # type: ignore


class AgentState(TypedDict):
    question: str
    # History is provided by the API request; we convert it into LangChain messages.
    history: list[dict[str, Any]]
    answer: str
    model: str


@lru_cache(maxsize=1)
def _get_llm():
    base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    model_name = os.environ.get("OLLAMA_MODEL", "llama3")
    temperature = float(os.environ.get("OLLAMA_TEMPERATURE", "0"))

    # ChatOllama follows the OpenAI-compatible chat interface.
    return ChatOllama(
        model=model_name,
        base_url=base_url,
        temperature=temperature,
    )


def _format_messages(question: str, history: list[dict[str, Any]]) -> list[Any]:
    system_prompt = (
        "You are a helpful assistant.\n"
        "Rules:\n"
        "- Only answer the user's question using your general knowledge.\n"
        "- Do not call external tools (no browsing, no database access).\n"
        "- If you are unsure, say you don't know rather than guessing.\n"
        "- Keep the answer concise and directly relevant.\n"
    )

    messages: list[Any] = [SystemMessage(content=system_prompt)]

    for turn in history:
        role = str(turn.get("role", "")).strip()
        content = str(turn.get("content", "")).strip()
        if not content:
            continue
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=question))
    return messages


def _chat_node(state: AgentState) -> AgentState:
    llm = _get_llm()
    model_name = os.environ.get("OLLAMA_MODEL", "llama3")

    messages = _format_messages(state["question"], state.get("history", []))
    response = llm.invoke(messages)

    # ChatOllama returns a BaseMessage-like object; `.content` holds the assistant text.
    content = getattr(response, "content", None)
    if isinstance(content, str) and content.strip():
        answer = content.strip()
    else:
        # Defensive fallback for unexpected return shapes.
        answer = str(response).strip()

    return {
        "question": state["question"],
        "history": state.get("history", []),
        "answer": answer,
        "model": model_name,
    }


def build_chat_graph():
    graph_builder = StateGraph(AgentState)
    graph_builder.add_node("chat", _chat_node)
    graph_builder.add_edge(START, "chat")
    graph_builder.add_edge("chat", END)
    return graph_builder.compile()


# Compile once at import-time; the graph has no per-request structure besides the state.
chat_graph = build_chat_graph()

