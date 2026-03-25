from __future__ import annotations

import json
import uuid
from typing import Any

from langgraph.types import Command

from api.hitl_graph import hitl_graph


def _print_interrupt(interrupt_value: Any) -> None:
    if not isinstance(interrupt_value, dict):
        print(f"Interrupt: {interrupt_value!r}")
        return

    missing_fields = interrupt_value.get("missing_fields") or []
    tool_name = interrupt_value.get("tool_name")
    print(f"Human-in-the-loop: need {missing_fields} for tool {tool_name!r}")


def main() -> None:
    thread_id = uuid.uuid4().hex
    history: list[dict[str, Any]] = []

    print("Lab 19 HITL CLI (type 'quit' to exit)")
    while True:
        user_q = input("\nYou: ").strip()
        if not user_q:
            continue
        if user_q.lower() in {"quit", "exit"}:
            break

        result = hitl_graph.invoke(
            {"question": user_q, "history": history},
            {"configurable": {"thread_id": thread_id}},
        )

        # Pause/resume loop.
        while "__interrupt__" in result:
            interrupts = result.get("__interrupt__") or []
            first = interrupts[0]
            _print_interrupt(first.value)

            resume_dict: dict[str, Any] = {}
            if isinstance(first.value, dict):
                missing_fields = first.value.get("missing_fields") or []
                for f in missing_fields:
                    resume_dict[f] = input(f"  {f}: ").strip()
            else:
                resume_dict = input("  Provide resume value (JSON if possible): ").strip()
                try:
                    resume_dict = json.loads(resume_dict)
                except Exception:
                    pass

            result = hitl_graph.invoke(
                Command(resume={first.id: resume_dict}),
                {"configurable": {"thread_id": thread_id}},
            )

        answer = result.get("answer") or ""
        print(f"\nAssistant: {answer}\n")
        history.append({"role": "user", "content": user_q})
        history.append({"role": "assistant", "content": answer})


if __name__ == "__main__":
    main()

