"""Pydantic schemas for Lab 18."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Role = Literal["user", "assistant"]


class ChatTurn(BaseModel):
    role: Role
    content: str


class ChatRequest(BaseModel):
    question: str = Field(description="User question to answer.")
    history: list[ChatTurn] = Field(
        default_factory=list,
        description="Optional chat history (oldest -> newest).",
    )


class ChatResponse(BaseModel):
    answer: str
    model: str

