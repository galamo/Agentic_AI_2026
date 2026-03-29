from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import Booking, CreateBookingRequest, coerce_booking_list_item


app = FastAPI(title="Lab 21 — Room Booking API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_DATA_FILE = Path(__file__).resolve().parent / "Data.json"
_LOCK = asyncio.Lock()


def _ensure_data_file() -> None:
    if _DATA_FILE.exists():
        return
    _DATA_FILE.write_text("[]", encoding="utf-8")


def _ranges_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and a_end > b_start


def _load_bookings_sync() -> list[Booking]:
    _ensure_data_file()
    try:
        raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

    if not isinstance(raw, list):
        return []

    out: list[Booking] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        coerced = coerce_booking_list_item(item)
        if coerced is not None:
            out.append(coerced)
    return out


def _save_bookings_sync(bookings: list[Booking]) -> None:
    _DATA_FILE.write_text(
        json.dumps([b.model_dump(mode="json") for b in bookings], indent=2),
        encoding="utf-8",
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "lab_21_client_only"}


@app.get("/api/bookings", response_model=list[Booking])
async def get_bookings() -> list[Booking]:
    async with _LOCK:
        return _load_bookings_sync()


@app.post("/api/bookings", response_model=Booking)
async def create_booking(payload: CreateBookingRequest) -> Booking:
    # Single lock covers load + conflict check + save to keep persistence consistent.
    async with _LOCK:
        bookings = _load_bookings_sync()

        start = payload.startIso
        end = payload.endIso
        if end <= start:
            raise HTTPException(status_code=422, detail="endIso must be after startIso")

        request_id = payload.requestId or f"req_{uuid.uuid4().hex}"
        new_booking = Booking(
            requestId=request_id,
            room=payload.room,
            startIso=start,
            endIso=end,
            description=payload.description,
            userName=payload.userName,
            createdAtIso=datetime.now(timezone.utc),
        )

        for existing in bookings:
            if existing.room != new_booking.room:
                continue
            if _ranges_overlap(new_booking.startIso, new_booking.endIso, existing.startIso, existing.endIso):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Room {new_booking.room} is already booked for "
                        f"{existing.startIso.isoformat()} - {existing.endIso.isoformat()} "
                        f"by {existing.userName}"
                    ),
                )

        # Append to the front (UI sorts descending, but this keeps new bookings visible immediately)
        updated = [new_booking, *bookings]
        _save_bookings_sync(updated)
        return new_booking


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)

