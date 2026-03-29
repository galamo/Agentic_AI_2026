from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Role = Literal["user", "assistant"]


class ChatTurn(BaseModel):
    role: Role
    content: str


class ChatStartRequest(BaseModel):
    question: str
    history: list[ChatTurn] = Field(
        default_factory=list,
        description="Ignored for graph input; conversation is loaded from the checkpointer for this session.",
    )
    session_id: str | None = Field(
        default=None,
        description="Stable session id; omit to start a new session (server returns a new id).",
    )
    thread_id: str | None = Field(
        default=None,
        description="Deprecated alias for session_id (LangGraph thread_id).",
    )


class InterruptInfo(BaseModel):
    id: str
    value: Any


class ChatResponse(BaseModel):
    session_id: str
    thread_id: str = Field(description="Same as session_id; kept for older clients.")
    model: str | None = None
    answer: str | None = None
    interrupt: InterruptInfo | None = None


class ChatResumeRequest(BaseModel):
    session_id: str | None = None
    thread_id: str | None = Field(
        default=None,
        description="Deprecated alias for session_id; one of session_id or thread_id is required.",
    )
    interrupt_id: str
    resume_value: Any
    history: list[ChatTurn] = Field(
        default_factory=list,
        description="Ignored; history is restored from the checkpointer.",
    )


class ChatHistoryResponse(BaseModel):
    session_id: str
    history: list[ChatTurn]
