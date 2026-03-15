"""
Load data.sql into the database (lab_8_PY Postgres on port 5434).
"""
import os
import sys
from pathlib import Path

# Allow running from lab root or from scripts/
lab_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(lab_root))

import psycopg2
from dotenv import load_dotenv

load_dotenv(lab_root / ".env")

data_path = lab_root / "data.sql"
if not data_path.exists():
    raise FileNotFoundError(f"data.sql not found at {data_path}")

conn = psycopg2.connect(
    host=os.environ.get("PG_HOST", "127.0.0.1"),
    port=int(os.environ.get("PG_PORT", "5434")),
    user=os.environ.get("PG_USER", "sso_user"),
    password=os.environ.get("PG_PASSWORD", "sso_pass"),
    database=os.environ.get("PG_DATABASE", "sso_db"),
)

def strip_leading_comments(stmt):
    """Drop leading blank lines and comment-only lines so INSERT/other statements run."""
    lines = stmt.strip().split("\n")
    while lines and (not lines[0].strip() or lines[0].strip().startswith("--")):
        lines.pop(0)
    return "\n".join(lines).strip()


try:
    print("Loading data from data.sql...")
    sql = data_path.read_text()
    if sql and not sql.endswith("\n"):
        sql = sql + "\n"
    # Split only on ";\n" so we don't break on semicolons inside or at end of lines
    raw_statements = [s.strip() for s in sql.split(";\n") if s.strip()]
    with conn.cursor() as cur:
        for stmt in raw_statements:
            stmt = strip_leading_comments(stmt)
            if stmt:
                # re-add the semicolon PostgreSQL expects at end of statement
                if not stmt.rstrip().endswith(";"):
                    stmt = stmt + ";"
                cur.execute(stmt)
    conn.commit()
    print("Data loaded successfully.")
finally:
    conn.close()
