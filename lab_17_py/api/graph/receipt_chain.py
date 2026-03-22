"""
Receipt processing LangGraph — intentionally minimal.

Students: replace the stub node with vision/OCR/classification nodes and
map the graph output to `Expense` fields in `api/main.py` (POST /api/receipts).
"""
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph


class ReceiptState(TypedDict, total=False):
    """Shared graph state. Extend with extracted fields as you build the chain."""

    image_bytes: bytes | None
    mime_type: str | None
    filename: str | None
    # Example fields students might add:
    # parsed_date: str | None
    # parsed_amount: float | None
    # parsed_type: str | None
    # raw_model_response: dict[str, Any] | None


def _stub_process_receipt(state: ReceiptState) -> dict[str, Any]:
    """
    Placeholder node: does not inspect the image yet.

    Task: implement nodes that call a vision model or OCR and return updates
    to merge into `ReceiptState`.
    """
    return {}


def build_receipt_graph():
    builder = StateGraph(ReceiptState)
    builder.add_node("process_receipt", _stub_process_receipt)
    builder.add_edge(START, "process_receipt")
    builder.add_edge("process_receipt", END)
    return builder.compile()


def run_receipt_graph(
    image_bytes: bytes,
    *,
    mime_type: str | None = None,
    filename: str | None = None,
) -> ReceiptState:
    """Run the compiled graph and return the final state."""
    graph = build_receipt_graph()
    initial: ReceiptState = {
        "image_bytes": image_bytes,
        "mime_type": mime_type,
        "filename": filename,
    }
    result = graph.invoke(initial)
    return result


def get_graph_mermaid() -> str:
    """Optional helper for documentation/debugging."""
    return """flowchart LR
  START --> process_receipt --> END
"""
