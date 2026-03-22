"""
Lab 17 API: receipt upload (LangGraph stub) + expense listing with filters.
"""
from contextlib import asynccontextmanager
from datetime import date
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.db import get_db, init_db
from api.graph.receipt_chain import run_receipt_graph
from api.models import Expense
from api.schemas import ExpenseListResponse, ExpenseOut, ReceiptUploadResponse, SummaryResponse, TypeTotal


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _seed_demo_if_empty()
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
    final_state = run_receipt_graph(data, mime_type=mime, filename=file.filename)
    safe_state = _sanitize_graph_state(dict(final_state))

    # Students: read parsed fields from final_state instead of placeholders.
    today = date.today()
    expense = Expense(
        expense_date=today,
        expense_type="pending",
        amount=0.0,
        receipt_filename=file.filename,
        notes="Uploaded via /api/receipts; replace with graph output when implemented.",
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    return ReceiptUploadResponse(
        message="Receipt stored; LangGraph chain is a stub — see lab README tasks.",
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


if __name__ == "__main__":
    import os

    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)
