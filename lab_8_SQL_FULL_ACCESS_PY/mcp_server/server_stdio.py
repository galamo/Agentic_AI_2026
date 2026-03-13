"""
PostgreSQL MCP server over stdio (for local / subprocess clients).
Run: python -m mcp_server.server_stdio — communicates via stdin/stdout.
"""
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    from mcp_server.server import mcp
    mcp.run(transport="stdio")
