from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.models import Expense
from api.schemas import ExpenseDateTotal, ReportsResponse, TypeTotal


def _apply_filters(
    q,
    *,
    date_from: date | None,
    date_to: date | None,
    expense_type: str | None,
):
    if date_from is not None:
        q = q.where(Expense.expense_date >= date_from)
    if date_to is not None:
        q = q.where(Expense.expense_date <= date_to)
    if expense_type:
        q = q.where(Expense.expense_type == expense_type.strip())
    return q


def compute_reports(
    db: Session,
    *,
    date_from: date | None,
    date_to: date | None,
    expense_type: str | None,
) -> ReportsResponse:
    total_q = select(func.coalesce(func.sum(Expense.amount), 0.0)).select_from(Expense)
    total_q = _apply_filters(total_q, date_from=date_from, date_to=date_to, expense_type=expense_type)
    grand_total = float(db.scalar(total_q) or 0.0)

    count_q = select(func.count()).select_from(Expense)
    count_q = _apply_filters(count_q, date_from=date_from, date_to=date_to, expense_type=expense_type)
    expense_count = int(db.scalar(count_q) or 0)

    by_type_q = (
        select(Expense.expense_type, func.coalesce(func.sum(Expense.amount), 0.0))
        .select_from(Expense)
        .group_by(Expense.expense_type)
        .order_by(func.coalesce(func.sum(Expense.amount), 0.0).desc())
    )
    by_type_q = _apply_filters(by_type_q, date_from=date_from, date_to=date_to, expense_type=expense_type)
    by_type_rows = db.execute(by_type_q).all()
    by_type = [TypeTotal(expense_type=str(r[0]), total_amount=float(r[1])) for r in by_type_rows]

    top_type = by_type[0] if by_type else None

    by_date_q = (
        select(Expense.expense_date, func.coalesce(func.sum(Expense.amount), 0.0))
        .select_from(Expense)
        .group_by(Expense.expense_date)
        .order_by(Expense.expense_date.asc())
    )
    by_date_q = _apply_filters(by_date_q, date_from=date_from, date_to=date_to, expense_type=expense_type)
    by_date_rows = db.execute(by_date_q).all()
    by_date = [ExpenseDateTotal(expense_date=r[0], total_amount=float(r[1])) for r in by_date_rows]

    return ReportsResponse(
        grand_total=grand_total,
        expense_count=expense_count,
        by_type=by_type,
        top_type=top_type,
        by_date=by_date,
    )

