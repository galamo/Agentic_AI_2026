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


class ChatRequest(BaseModel):
    question: str = Field(description="Natural-language question about the expenses DB.")
    date_from: date | None = Field(default=None, description="Filter lower bound (expense_date).")
    date_to: date | None = Field(default=None, description="Filter upper bound (expense_date).")
    expense_type: str | None = Field(default=None, description="Filter by expense_type (exact match).")
    limit: int = Field(default=50, ge=1, le=200, description="Max number of rows to return.")


class ChatResponse(BaseModel):
    answer: str
    sql: str
    row_count: int
    rows: list[dict[str, Any]]


class ExpenseDateTotal(BaseModel):
    expense_date: date
    total_amount: float = Field(..., description="Sum of amounts for this date in the filtered range")


class ReportsResponse(BaseModel):
    grand_total: float
    expense_count: int
    by_type: list[TypeTotal]
    top_type: TypeTotal | None
    by_date: list[ExpenseDateTotal]
