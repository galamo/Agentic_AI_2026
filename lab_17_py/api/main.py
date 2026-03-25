"""
Lab 17 API: receipt upload (LangGraph stub) + expense listing with filters.
"""
from contextlib import asynccontextmanager
from datetime import date
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.db import get_db, init_db
from api.graph.receipt_chain import run_receipt_graph
from api.rag.schema_rag_pgv import ensure_schema_vector_index
from api.rag.sql_chat import run_sql_chat
from api.models import Expense
from api.reports import compute_reports
from api.schemas import (
    ChatRequest,
    ChatResponse,
    ExpenseListResponse,
    ExpenseOut,
    ReceiptUploadResponse,
    ReportsResponse,
    SummaryResponse,
    TypeTotal,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _seed_demo_if_empty()
    # Optional: eagerly build the schema-as-vector index on startup.
    # This makes the first chat request faster, but requires the embedding API key.
    if os.environ.get("SCHEMA_RAG_INDEX_ON_STARTUP", "1") == "1" and os.environ.get("OPENROUTER_API_KEY"):
        try:
            ensure_schema_vector_index()
        except Exception:
            # Startup must not fail if embeddings are temporarily unavailable.
            pass
    yield


app = FastAPI(title="Lab 17 Expenses API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _seed_demo_if_empty() -> None:
    from api.db import SessionLocal

    db = SessionLocal()
    try:
        n = db.scalar(select(func.count()).select_from(Expense))
        if n and n > 0:
            return
        samples = [
            Expense(
                expense_date=date(2026, 3, 1),
                expense_type="food",
                amount=42.5,
                receipt_filename=None,
                notes="Demo seed",
            ),
            Expense(
                expense_date=date(2026, 3, 5),
                expense_type="transport",
                amount=18.0,
                receipt_filename=None,
                notes="Demo seed",
            ),
            Expense(
                expense_date=date(2026, 3, 10),
                expense_type="food",
                amount=120.0,
                receipt_filename=None,
                notes="Demo seed",
            ),
        ]
        db.add_all(samples)
        db.commit()
    finally:
        db.close()


def _sanitize_graph_state(state: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in state.items():
        if k == "image_bytes" and isinstance(v, (bytes, bytearray)):
            raw = bytes(v)
            out[k] = f"<binary {len(raw)} bytes>"
        else:
            out[k] = v
    return out


@app.post("/api/receipts", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Accept a receipt image, pass bytes through the LangGraph chain (stub),
    then persist a row. Until students implement extraction, amounts/types are placeholders.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    mime = file.content_type
    try:
        final_state = run_receipt_graph(data, mime_type=mime, filename=file.filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Receipt extraction failed: {e}") from e
    safe_state = _sanitize_graph_state(dict(final_state))

    parsed_date = final_state.get("parsed_expense_date")
    parsed_type = final_state.get("parsed_expense_type")
    parsed_amount = final_state.get("parsed_amount")
    parsed_notes = final_state.get("parsed_notes")

    if not parsed_date or not parsed_type or parsed_amount is None:
        raise HTTPException(
            status_code=422,
            detail=f"Receipt extraction failed to return required fields. graph_state keys={list(final_state.keys())}",
        )

    try:
        expense_date = date.fromisoformat(str(parsed_date))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid parsed expense_date: {parsed_date!r}") from e

    try:
        amount = float(parsed_amount)
        if amount < 0:
            raise ValueError("amount must be >= 0")
    except (TypeError, ValueError) as e:
        raise HTTPException(status_code=422, detail=f"Invalid parsed amount: {parsed_amount!r}") from e

    expense = Expense(
        expense_date=expense_date,
        expense_type=str(parsed_type).strip().lower(),
        amount=amount,
        receipt_filename=file.filename,
        notes=parsed_notes,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    return ReceiptUploadResponse(
        message="Receipt stored; extracted fields saved to DB.",
        expense=ExpenseOut.model_validate(expense),
        graph_state=safe_state,
    )


@app.get("/api/expenses", response_model=ExpenseListResponse)
def list_expenses(
    db: Session = Depends(get_db),
    date_from: date | None = Query(None, description="Inclusive lower bound (expense_date)"),
    date_to: date | None = Query(None, description="Inclusive upper bound (expense_date)"),
    expense_type: str | None = Query(None, description="Filter by expense type (exact match)"),
):
    q = select(Expense).order_by(Expense.expense_date.desc(), Expense.id.desc())
    if date_from is not None:
        q = q.where(Expense.expense_date >= date_from)
    if date_to is not None:
        q = q.where(Expense.expense_date <= date_to)
    if expense_type:
        q = q.where(Expense.expense_type == expense_type.strip())

    rows = list(db.scalars(q).all())
    return ExpenseListResponse(
        items=[ExpenseOut.model_validate(r) for r in rows],
        total_count=len(rows),
    )


@app.get("/api/expenses/summary", response_model=SummaryResponse)
def expenses_summary(
    db: Session = Depends(get_db),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    expense_type: str | None = Query(None),
):
    """Aggregate totals by expense_type for pie charts (respects same filters as list)."""
    q = select(Expense.expense_type, func.coalesce(func.sum(Expense.amount), 0.0)).group_by(Expense.expense_type)
    if date_from is not None:
        q = q.where(Expense.expense_date >= date_from)
    if date_to is not None:
        q = q.where(Expense.expense_date <= date_to)
    if expense_type:
        q = q.where(Expense.expense_type == expense_type.strip())

    rows = db.execute(q).all()
    by_type = [TypeTotal(expense_type=str(r[0]), total_amount=float(r[1])) for r in rows]
    grand = sum(t.total_amount for t in by_type)
    return SummaryResponse(by_type=by_type, grand_total=grand)


@app.get("/health")
def health():
    return {"ok": True, "service": "lab_17_py"}


@app.post("/api/chat", response_model=ChatResponse)
def chat_about_expenses(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Ask questions about the expenses DB using:
    - schema-as-vector retrieval
    - LLM SQL generation (read-only)
    - SQL execution + natural language answer
    """
    answer, sql, rows = run_sql_chat(
        db=db,
        question=payload.question,
        date_from=payload.date_from,
        date_to=payload.date_to,
        expense_type=payload.expense_type,
        limit=payload.limit,
    )
    return ChatResponse(answer=answer, sql=sql, row_count=len(rows), rows=rows)


@app.get("/api/reports", response_model=ReportsResponse)
def reports(
    db: Session = Depends(get_db),
    date_from: date | None = Query(None, description="Inclusive lower bound (expense_date)"),
    date_to: date | None = Query(None, description="Inclusive upper bound (expense_date)"),
    expense_type: str | None = Query(None, description="Filter by expense type (exact match)"),
):
    return compute_reports(db, date_from=date_from, date_to=date_to, expense_type=expense_type)


if __name__ == "__main__":
    import os

    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)
