from __future__ import annotations

import os
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.types import Command

from api.hitl_graph import hitl_graph
from api.schemas import (
    ChatResumeRequest,
    ChatResponse,
    ChatStartRequest,
    InterruptInfo,
)

load_dotenv()

app = FastAPI(title="Lab 19 — HITL", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "lab_19_hitl_py"}


def _config(thread_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": thread_id}}


def _format_graph_response(result: dict[str, Any], *, thread_id: str) -> ChatResponse:
    if "__interrupt__" in result:
        interrupts = result.get("__interrupt__") or []
        first = interrupts[0]
        return ChatResponse(
            thread_id=thread_id,
            model=result.get("model"),
            answer=None,
            tool_result=result.get("tool_result"),
            interrupt=InterruptInfo(id=first.id, value=first.value),
        )

    return ChatResponse(
        thread_id=thread_id,
        model=result.get("model"),
        answer=result.get("answer"),
        tool_result=result.get("tool_result"),
        interrupt=None,
    )


@app.post("/api/chat", response_model=ChatResponse)
def chat_start(payload: ChatStartRequest) -> ChatResponse:
    thread_id = payload.thread_id or uuid.uuid4().hex
    result = hitl_graph.invoke(
        {
            "question": payload.question,
            "history": [t.model_dump() for t in payload.history],
        },
        _config(thread_id),
    )
    return _format_graph_response(result, thread_id=thread_id)


@app.post("/api/chat/resume", response_model=ChatResponse)
def chat_resume(payload: ChatResumeRequest) -> ChatResponse:
    cmd = Command(resume={payload.interrupt_id: payload.resume_value})
    result = hitl_graph.invoke(cmd, _config(payload.thread_id))
    return _format_graph_response(result, thread_id=payload.thread_id)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)

