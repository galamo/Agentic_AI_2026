"""
Shared MCP server definition: PostgreSQL tools (list_schemas, list_tables,
describe_table, get_create_table, sql_execute). Single FastMCP instance.
"""
from mcp.server.fastmcp import FastMCP
from . import tools as tools_impl

LOG_PREFIX = "[MCP]"

mcp = FastMCP(
    "postgres-mcp",
    version="1.0.0",
)


@mcp.tool()
def list_schemas() -> list[str]:
    """List all user-visible schemas in the PostgreSQL database."""
    print(f"{LOG_PREFIX} list_schemas called", flush=True)
    out = tools_impl.list_schemas()
    print(f"{LOG_PREFIX} list_schemas result: {len(out)} schema(s)", flush=True)
    return out


@mcp.tool()
def list_tables(schema: str) -> list[str]:
    """List all tables in the given schema (e.g. public)."""
    print(f'{LOG_PREFIX} list_tables called schema="{schema}"', flush=True)
    out = tools_impl.list_tables(schema)
    print(f"{LOG_PREFIX} list_tables result: {len(out)} table(s) {out}", flush=True)
    return out


@mcp.tool()
def describe_table(schema: str, table: str) -> list[dict]:
    """Return column names, types, nullable, and default for a table."""
    print(f'{LOG_PREFIX} describe_table called schema="{schema}" table="{table}"', flush=True)
    out = tools_impl.describe_table(schema, table)
    print(f"{LOG_PREFIX} describe_table result: {len(out)} column(s)", flush=True)
    return out


@mcp.tool()
def get_create_table(schema: str, table: str) -> str:
    """Return an approximate CREATE TABLE statement for the given table."""
    print(f'{LOG_PREFIX} get_create_table called schema="{schema}" table="{table}"', flush=True)
    out = tools_impl.get_create_table(schema, table)
    print(f"{LOG_PREFIX} get_create_table result: {'OK' if out else 'not found'}", flush=True)
    return out or f"Table {schema}.{table} not found."


@mcp.tool()
def sql_execute(sql: str, params: list | None = None) -> dict:
    """Execute a parameterized SQL statement (SELECT, INSERT, UPDATE, DELETE, etc.).
    Pass params as a JSON array for $1, $2, ... (use %s for psycopg2 style; we use positional %s).
    """
    safe_params = params if params is not None else []
    # MCP/JSON use $1, $2; psycopg2 uses %s. Convert for compatibility if needed.
    # Our tools.query uses %s and params list; keep SQL as-is and pass params.
    print(f"{LOG_PREFIX} sql_execute called sql={sql[:120]}{'...' if len(sql) > 120 else ''} params={safe_params}", flush=True)
    result = tools_impl.sql_execute(sql, safe_params)
    print(f"{LOG_PREFIX} sql_execute result: command={result['command']} rowCount={result['rowCount']}", flush=True)
    return result
