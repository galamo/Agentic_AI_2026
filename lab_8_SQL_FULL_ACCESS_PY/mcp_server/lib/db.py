"""
PostgreSQL pool for MCP server (same defaults as lab_7 / lab_8 docker-compose).
"""
import os
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

_pool = None


def get_pool():
    global _pool
    if _pool is None:
        _pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            host=os.environ.get("PG_HOST", "127.0.0.1"),
            port=int(os.environ.get("PG_PORT", "5434")),
            user=os.environ.get("PG_USER", "sso_user"),
            password=os.environ.get("PG_PASSWORD", "sso_pass"),
            database=os.environ.get("PG_DATABASE", "sso_db"),
        )
    return _pool


def query(text: str, params: list | None = None):
    """Execute a query and return (rows, rowcount, command)."""
    conn = get_pool().getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(text, params or [])
            if cur.description:
                rows = cur.fetchall()
                colnames = [d[0] for d in cur.description]
                result_rows = [dict(zip(colnames, row)) for row in rows]
                return type("Result", (), {"rows": result_rows, "rowCount": len(result_rows), "command": cur.statusmessage})()
            return type("Result", (), {"rows": [], "rowCount": cur.rowcount, "command": cur.statusmessage})()
    finally:
        get_pool().putconn(conn)
