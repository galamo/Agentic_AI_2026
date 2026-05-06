from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import TypedDict
from uuid import uuid4

from langgraph.graph import END, START, StateGraph
from openai import OpenAI

from .audio_utils import extract_audio_from_video
from .config import (
    AUDIO_DIR,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_STT_MODEL,
    OPENROUTER_TEXT_MODEL,
    TRANSCRIPT_DIR,
    UPLOAD_DIR,
)


class VideoPipelineState(TypedDict):
    original_filename: str
    video_bytes: bytes
    video_path: str
    audio_path: str
    raw_transcript: str
    final_transcript: str
    transcript_file_path: str
    output: str


def _build_openrouter_audio_client() -> OpenAI:
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is missing.")
    return OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL)


def intake_and_extract_agent(state: VideoPipelineState) -> VideoPipelineState:
    suffix = Path(state["original_filename"]).suffix or ".mp4"
    file_id = uuid4().hex
    video_path = UPLOAD_DIR / f"{file_id}{suffix}"
    audio_path = AUDIO_DIR / f"{file_id}.wav"

    video_path.write_bytes(state["video_bytes"])
    extract_audio_from_video(video_path=video_path, audio_output_path=audio_path)

    state["video_path"] = str(video_path)
    state["audio_path"] = str(audio_path)
    return state


def speech_to_text_agent(state: VideoPipelineState) -> VideoPipelineState:
    client = _build_openrouter_audio_client()
    audio_path = Path(state["audio_path"])

    with audio_path.open("rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model=OPENROUTER_STT_MODEL,
            file=audio_file,
        )

    raw_text = getattr(transcript, "text", "") or ""
    state["raw_transcript"] = raw_text.strip()
    return state


def transcript_refiner_agent(state: VideoPipelineState) -> VideoPipelineState:
    raw_transcript = state.get("raw_transcript", "").strip()
    if not raw_transcript:
        state["final_transcript"] = ""
        return state

    client = _build_openrouter_audio_client()
    try:
        result = client.chat.completions.create(
            model=OPENROUTER_TEXT_MODEL,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You clean transcript text while preserving meaning. "
                        "Do not summarize, do not shorten, and keep full information."
                    ),
                },
                {"role": "user", "content": raw_transcript},
            ],
        )
        refined = (result.choices[0].message.content or "").strip()
        state["final_transcript"] = refined or raw_transcript
    except Exception:
        # Keep pipeline resilient when text model refinement fails.
        state["final_transcript"] = raw_transcript
    return state


def writer_agent(state: VideoPipelineState) -> VideoPipelineState:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"transcript_{timestamp}_{uuid4().hex[:8]}.txt"
    transcript_file = TRANSCRIPT_DIR / filename
    transcript_text = state.get("final_transcript") or state.get("raw_transcript", "")

    transcript_file.write_text(transcript_text, encoding="utf-8")

    state["transcript_file_path"] = str(transcript_file)
    state["output"] = transcript_text
    return state


def build_video_pipeline():
    graph = StateGraph(VideoPipelineState)
    graph.add_node("intake_and_extract_agent", intake_and_extract_agent)
    graph.add_node("speech_to_text_agent", speech_to_text_agent)
    graph.add_node("transcript_refiner_agent", transcript_refiner_agent)
    graph.add_node("writer_agent", writer_agent)

    graph.add_edge(START, "intake_and_extract_agent")
    graph.add_edge("intake_and_extract_agent", "speech_to_text_agent")
    graph.add_edge("speech_to_text_agent", "transcript_refiner_agent")
    graph.add_edge("transcript_refiner_agent", "writer_agent")
    graph.add_edge("writer_agent", END)

    return graph.compile()
