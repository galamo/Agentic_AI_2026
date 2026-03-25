-- Lab 17 expenses schema (source of truth for:
-- 1) Postgres table creation (docker init)
-- 2) Schema-as-vector RAG indexing)

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  expense_type VARCHAR(128) NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  receipt_filename VARCHAR(512),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_expenses_expense_date ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS ix_expenses_expense_type ON expenses (expense_type);
