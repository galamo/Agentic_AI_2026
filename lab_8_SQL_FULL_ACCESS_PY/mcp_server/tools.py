"""
PostgreSQL tool implementations for the MCP server.
"""
from .lib.db import query


def list_schemas():
    result = query(
        """SELECT schema_name FROM information_schema.schemata
         WHERE schema_name NOT IN ('pg_catalog', 'pg_toast', 'information_schema')
         ORDER BY schema_name"""
    )
    return [r["schema_name"] for r in result.rows]


def list_tables(schema: str):
    result = query(
        """SELECT table_name FROM information_schema.tables
         WHERE table_schema = %s AND table_type = 'BASE TABLE'
         ORDER BY table_name""",
        [schema],
    )
    return [r["table_name"] for r in result.rows]


def describe_table(schema: str, table: str):
    result = query(
        """SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = %s AND table_name = %s
         ORDER BY ordinal_position""",
        [schema, table],
    )
    return [
        {
            "column_name": r["column_name"],
            "data_type": r["data_type"],
            "is_nullable": r["is_nullable"],
            "column_default": r["column_default"],
        }
        for r in result.rows
    ]


def get_create_table(schema: str, table: str):
    cols = query(
        """SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = %s AND table_name = %s
         ORDER BY ordinal_position""",
        [schema, table],
    )
    if not cols.rows:
        return None
    pk_result = query(
        """SELECT a.attname
         FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
         JOIN pg_class c ON c.oid = i.indrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = %s AND c.relname = %s AND i.indisprimary AND a.attnum > 0 AND NOT a.attisdropped""",
        [schema, table],
    )
    pk_cols = [r["attname"] for r in pk_result.rows]
    lines = []
    for r in cols.rows:
        def_ = f"{r['column_name']} {r['data_type']}"
        if r.get("character_maximum_length"):
            def_ += f"({r['character_maximum_length']})"
        if r["is_nullable"] == "NO":
            def_ += " NOT NULL"
        if r.get("column_default"):
            def_ += f" DEFAULT {r['column_default']}"
        lines.append(def_)
    if pk_cols:
        lines.append(f"PRIMARY KEY ({', '.join(pk_cols)})")
    return f"CREATE TABLE {schema}.{table} (\n  " + ",\n  ".join(lines) + "\n);"


def sql_execute(sql: str, params: list | None = None):
    import re
    params = params if params is not None else []
    # Convert pg-style $1, $2 to psycopg2 %s
    sql = re.sub(r"\$\d+", "%s", sql)
    result = query(sql, params)
    return {
        "rows": result.rows,
        "rowCount": result.rowCount,
        "command": result.command,
    }
