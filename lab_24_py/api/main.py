"""Lab 24 API: FastAPI + LangGraph booking agent with HITL interrupts."""

from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from langgraph.types import Command

from api.booking_hitl_graph import build_booking_hitl_graph
from api.schemas import ChatHistoryResponse, ChatResponse, ChatResumeRequest, ChatStartRequest, ChatTurn, InterruptInfo

load_dotenv()


@asynccontextmanager
async def _lifespan(app: FastAPI):
    mysql_uri = os.environ.get("LAB24_MYSQL_URI", "").strip()
    if mysql_uri:
        from langgraph.checkpoint.mysql.aio import AIOMySQLSaver

        async with AIOMySQLSaver.from_conn_string(mysql_uri) as saver:
            await saver.setup()
            app.state.graph = build_booking_hitl_graph(saver)
            yield
    else:
        from langgraph.checkpoint.memory import MemorySaver

        saver = MemorySaver()
        app.state.graph = build_booking_hitl_graph(saver)
        yield


app = FastAPI(title="Lab 24 — Room Booking Chatbot (HITL)", version="0.1.0", lifespan=_lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _config(thread_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": thread_id}}


def _resolve_session_id(payload_session: str | None, payload_thread: str | None) -> str:
    return (payload_session or payload_thread or "").strip() or uuid.uuid4().hex


def _format_graph_response(result: dict[str, Any], *, session_id: str) -> ChatResponse:
    if "__interrupt__" in result:
        interrupts = result.get("__interrupt__") or []
        first = interrupts[0]
        return ChatResponse(
            session_id=session_id,
            thread_id=session_id,
            model=result.get("model"),
            answer=None,
            interrupt=InterruptInfo(id=first.id, value=first.value),
        )

    return ChatResponse(
        session_id=session_id,
        thread_id=session_id,
        model=result.get("model"),
        answer=result.get("answer"),
        interrupt=None,
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "lab_24_py"}


@app.get("/api/chat/history/{session_id}", response_model=ChatHistoryResponse)
async def chat_history(session_id: str, request: Request) -> ChatHistoryResponse:
    graph = request.app.state.graph
    snap = await graph.aget_state(_config(session_id))
    raw = (snap.values or {}).get("history") if snap and snap.values else None
    turns: list[ChatTurn] = []
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            content = item.get("content")
            if role in ("user", "assistant") and isinstance(content, str):
                turns.append(ChatTurn(role=role, content=content))
    return ChatHistoryResponse(session_id=session_id, history=turns)


@app.post("/api/chat", response_model=ChatResponse)
async def chat_start(payload: ChatStartRequest, request: Request) -> ChatResponse:
    session_id = _resolve_session_id(payload.session_id, payload.thread_id)
    graph = request.app.state.graph
    result = await graph.ainvoke(
        {
            "question": payload.question,
            "history": [{"role": "user", "content": payload.question}],
        },
        _config(session_id),
    )
    return _format_graph_response(result, session_id=session_id)


@app.post("/api/chat/resume", response_model=ChatResponse)
async def chat_resume(payload: ChatResumeRequest, request: Request) -> ChatResponse:
    session_id = (payload.session_id or payload.thread_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id or thread_id is required to resume.")
    cmd = Command(resume={payload.interrupt_id: payload.resume_value})
    graph = request.app.state.graph
    result = await graph.ainvoke(cmd, _config(session_id))
    return _format_graph_response(result, session_id=session_id)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)
