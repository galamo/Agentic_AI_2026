from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Role = Literal["user", "assistant"]


class ChatTurn(BaseModel):
    role: Role
    content: str


class ChatStartRequest(BaseModel):
    question: str = Field(description="User question to answer.")
    history: list[ChatTurn] = Field(default_factory=list, description="Optional chat history.")
    thread_id: str | None = Field(
        default=None,
        description="Optional session id. If omitted, the server will generate one.",
    )


class InterruptInfo(BaseModel):
    id: str
    value: Any


class ChatResponse(BaseModel):
    thread_id: str
    model: str | None = None
    answer: str | None = None
    tool_result: Any | None = None
    interrupt: InterruptInfo | None = None


class ChatResumeRequest(BaseModel):
    thread_id: str
    interrupt_id: str
    # When the tool needs N missing params, resume_value should be a JSON object
    # like {"param1": "...", "param2": "..."}.
    resume_value: Any

    # Included for convenience, but the graph resumes based on checkpoint state.
    history: list[ChatTurn] = Field(default_factory=list)

