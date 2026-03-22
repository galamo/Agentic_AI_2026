"""Pydantic schemas for API responses."""
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class ExpenseOut(BaseModel):
    id: int
    expense_date: date
    expense_type: str
    amount: float
    receipt_filename: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    items: list[ExpenseOut]
    total_count: int


class TypeTotal(BaseModel):
    expense_type: str
    total_amount: float = Field(..., description="Sum of amounts for this type in the filtered range")


class SummaryResponse(BaseModel):
    by_type: list[TypeTotal]
    grand_total: float


class ReceiptUploadResponse(BaseModel):
    message: str
    expense: ExpenseOut
    graph_state: dict[str, Any] = Field(
        default_factory=dict,
        description="Last state returned by the LangGraph receipt chain (students extend this).",
    )
