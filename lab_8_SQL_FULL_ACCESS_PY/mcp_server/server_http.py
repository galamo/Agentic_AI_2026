"""
PostgreSQL MCP server over Streamable HTTP.
Run: python -m mcp_server.server_http (or uv run server_http.py)
POST /mcp — MCP protocol endpoint.
"""
import os

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    port = int(os.environ.get("MCP_PORT", "3101"))
    host = os.environ.get("MCP_HOST", "127.0.0.1")

    from mcp_server.server import mcp
    mcp.run(transport="streamable-http", host=host, port=port, path="/mcp")
