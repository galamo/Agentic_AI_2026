"""
Load schema.sql into the database (lab_8_PY Postgres on port 5434).
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

schema_path = lab_root / "schema.sql"
if not schema_path.exists():
    raise FileNotFoundError(f"schema.sql not found at {schema_path}")

conn = psycopg2.connect(
    host=os.environ.get("PG_HOST", "127.0.0.1"),
    port=int(os.environ.get("PG_PORT", "5434")),
    user=os.environ.get("PG_USER", "sso_user"),
    password=os.environ.get("PG_PASSWORD", "sso_pass"),
    database=os.environ.get("PG_DATABASE", "sso_db"),
)

try:
    print("Loading schema from schema.sql...")
    sql = schema_path.read_text()
    with conn.cursor() as cur:
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt and not stmt.startswith("--"):
                cur.execute(stmt)
    conn.commit()
    print("Schema loaded successfully.")
finally:
    conn.close()
