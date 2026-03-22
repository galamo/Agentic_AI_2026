"""SQLAlchemy models."""
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Float, Integer, String, Text

from api.db import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    expense_date = Column(Date, nullable=False, index=True)
    expense_type = Column(String(128), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    receipt_filename = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
