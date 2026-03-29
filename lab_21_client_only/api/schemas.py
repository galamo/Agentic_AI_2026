from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Booking(BaseModel):
    requestId: str
    room: int
    startIso: datetime
    endIso: datetime
    description: str
    userName: str
    createdAtIso: datetime

    model_config = ConfigDict(extra="forbid")


class CreateBookingRequest(BaseModel):
    requestId: str | None = None
    room: int = Field(..., ge=1, le=10)
    startIso: datetime
    endIso: datetime
    description: str
    userName: str

    model_config = ConfigDict(extra="forbid")


def coerce_booking_list_item(data: Any) -> Booking | None:
    """
    Best-effort coercion for persisted JSON.
    Returns `None` for invalid items rather than failing the whole load.
    """
    try:
        return Booking.model_validate(data)
    except Exception:
        return None

