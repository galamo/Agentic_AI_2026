"""
PostgreSQL MCP server over Streamable HTTP.
Run: python -m mcp_server.server_http (or uv run server_http.py)
POST /mcp — MCP protocol endpoint. Uses MCP_HOST, MCP_PORT (default 3101), MCP_PATH (default /mcp) from env.
"""
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()  # so MCP_HOST, MCP_PORT, MCP_PATH are set before server is imported

    # Relax SDK transport security: accept any POST (Content-Type check can reject some clients)
    from mcp.server import transport_security as _ts
    _original_validate = _ts.TransportSecurityMiddleware._validate_content_type

    def _accept_content_type(self, content_type: str | None) -> bool:
        if content_type and content_type.lower().startswith("application/json"):
            return True
        # Allow missing or other content-type for POST so MCP clients are not rejected with 400
        return True

    _ts.TransportSecurityMiddleware._validate_content_type = _accept_content_type  # type: ignore[method-assign]

    from mcp_server.server import mcp
    import uvicorn

    app = mcp.streamable_http_app()
    host = mcp.settings.host
    port = mcp.settings.port
    uvicorn.run(app, host=host, port=port, log_level=mcp.settings.log_level.lower())
