from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel
from pydantic import Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[ChatTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    model: str | None = None


# Booking-specific fields returned by the agent (internal contract).
class BookingIntent(BaseModel):
    meeting_description: str
    user_name: str
    room: int
    start_datetime_local: str  # YYYY-MM-DDTHH:00


class BookingToolResult(BaseModel):
    ok: bool
    status_type: Literal["success", "error"]
    ui_text: str
    request_id: str | None = None
    raw: dict[str, Any] = {}

