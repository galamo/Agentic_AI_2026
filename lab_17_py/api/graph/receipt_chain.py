"""
Receipt processing LangGraph.

Flow:
1) Vision extraction (receipt image -> structured JSON)
2) Normalization (types, normalization of expense_type)
"""

from __future__ import annotations

import base64
import json
import os
import re
from datetime import date
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph


class ReceiptState(TypedDict, total=False):
    """Shared graph state."""

    image_bytes: bytes | None
    mime_type: str | None
    filename: str | None

    # Extracted by the model:
    parsed_expense_date: str | None  # ISO YYYY-MM-DD
    parsed_expense_type: str | None
    parsed_amount: float | None
    parsed_notes: str | None

    # Debugging/trace:
    raw_extraction: dict[str, Any] | None


def _get_llm(api_key: str) -> ChatOpenAI:
    """
    Receipt extraction needs image understanding.

    OpenRouter models that support images generally follow the OpenAI chat API
    convention for `image_url` messages.
    """

    model_name = os.environ.get("RECEIPT_VISION_MODEL", "openai/gpt-4o-mini")
    return ChatOpenAI(
        model=model_name,
        temperature=0,
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def _extract_receipt_fields(state: ReceiptState) -> dict[str, Any]:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("Missing OPENROUTER_API_KEY (required for receipt extraction).")

    if not state.get("image_bytes"):
        raise RuntimeError("No image_bytes provided to receipt graph.")

    mime_type = state.get("mime_type") or "image/jpeg"
    b64 = base64.b64encode(state["image_bytes"]).decode("ascii")
    data_url = f"data:{mime_type};base64,{b64}"

    system_prompt = """You extract structured expense data from a receipt image.
Return ONLY valid JSON (no markdown, no extra keys).

Required output keys:
- expense_date: string ISO format "YYYY-MM-DD" (use best guess; if no date is visible, use today's date in ISO format)
- expense_type: one short lowercase category (choose one of: food, transport, shopping, utilities, rent, health, entertainment, other)
- amount: a number (e.g. 12.34). Use the grand total or the main billed amount.
- notes: optional string (merchant name or other useful info; or null if unknown)

Rules:
- amount must be >= 0
- expense_type must be one of the provided categories
"""

    user_prompt = (
        "Extract the above fields from the receipt image. If you can’t read something, still return best-effort values."
    )

    content = [
        {"type": "text", "text": user_prompt},
        {"type": "image_url", "image_url": {"url": data_url}},
    ]

    llm = _get_llm(api_key)
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=content)]
    response = llm.invoke(messages)
    raw = response.content if isinstance(response.content, str) else str(response.content)

    # Allow the model to wrap in ```json ... ``` by stripping fences.
    cleaned = re.sub(r"```json\\s*|```", "", raw).strip()
    parsed: dict[str, Any] = json.loads(cleaned)

    return {
        "raw_extraction": parsed,
        "parsed_expense_date": parsed.get("expense_date"),
        "parsed_expense_type": parsed.get("expense_type"),
        "parsed_amount": parsed.get("amount"),
        "parsed_notes": parsed.get("notes"),
    }


def _normalize_fields(state: ReceiptState) -> dict[str, Any]:
    # Date:
    raw_date = state.get("parsed_expense_date")
    parsed_date: str | None = None
    if isinstance(raw_date, str) and raw_date.strip():
        try:
            parsed_date = date.fromisoformat(raw_date.strip()).isoformat()
        except ValueError:
            parsed_date = date.today().isoformat()
    elif raw_date is None:
        parsed_date = date.today().isoformat()

    # Type:
    raw_type = state.get("parsed_expense_type") or "other"
    normalized = raw_type.strip().lower()
    allowed = {"food", "transport", "shopping", "utilities", "rent", "health", "entertainment", "other"}
    if normalized not in allowed:
        # Best-effort fallback: keep the model’s guess if close-ish, otherwise bucket to other.
        normalized = normalized.split()[0]
        if normalized not in allowed:
            normalized = "other"

    # Amount:
    amount_val = state.get("parsed_amount")
    amount: float | None = None
    try:
        if amount_val is None:
            amount = 0.0
        else:
            amount = float(amount_val)
            if amount < 0:
                amount = 0.0
    except (TypeError, ValueError):
        amount = 0.0

    notes = state.get("parsed_notes")
    if notes is not None and isinstance(notes, str):
        notes = notes.strip() or None

    return {
        "parsed_expense_date": parsed_date,
        "parsed_expense_type": normalized,
        "parsed_amount": amount,
        "parsed_notes": notes,
    }


def build_receipt_graph():
    builder = StateGraph(ReceiptState)
    builder.add_node("extract_receipt_fields", _extract_receipt_fields)
    builder.add_node("normalize_fields", _normalize_fields)
    builder.add_edge(START, "extract_receipt_fields")
    builder.add_edge("extract_receipt_fields", "normalize_fields")
    builder.add_edge("normalize_fields", END)
    return builder.compile()


def run_receipt_graph(
    image_bytes: bytes,
    *,
    mime_type: str | None = None,
    filename: str | None = None,
) -> ReceiptState:
    """Run the receipt extraction graph and return the final state."""
    graph = build_receipt_graph()
    initial: ReceiptState = {
        "image_bytes": image_bytes,
        "mime_type": mime_type,
        "filename": filename,
    }
    return graph.invoke(initial)


def get_graph_mermaid() -> str:
    return """flowchart LR
  START --> extract_receipt_fields --> normalize_fields --> END
"""
