"""Lab 22 API: FastAPI + LangGraph booking agent."""

from __future__ import annotations

from typing import Any

from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from api.booking_agent import run_booking_agent
from api.schemas import ChatRequest, ChatResponse

load_dotenv()


app = FastAPI(title="Lab 22 — Room Booking Chatbot", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "lab_22_py"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    result = run_booking_agent(payload)
    return ChatResponse(answer=result["answer"], model=result.get("model"))


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)

