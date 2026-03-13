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

try:
    print("Loading data from data.sql...")
    sql = data_path.read_text()
    with conn.cursor() as cur:
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt and not stmt.startswith("--"):
                cur.execute(stmt)
    conn.commit()
    print("Data loaded successfully.")
finally:
    conn.close()
