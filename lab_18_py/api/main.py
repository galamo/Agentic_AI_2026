"""Lab 18 API: LangGraph chatbot wired to local Ollama."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from api.ollama_agent import chat_graph
from api.schemas import ChatRequest, ChatResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Graph compiles at import-time in `ollama_agent.py`.
    yield


app = FastAPI(title="Lab 18 — Ollama Chatbot", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "lab_18_py"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    result = chat_graph.invoke(
        {
            "question": payload.question,
            "history": [t.model_dump() for t in payload.history],
        }
    )
    return ChatResponse(answer=result["answer"], model=result["model"])


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)

