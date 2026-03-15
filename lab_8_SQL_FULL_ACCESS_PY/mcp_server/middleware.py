"""Middleware for the MCP Streamable HTTP server."""
from starlette.types import ASGIApp, Receive, Scope, Send

CONTENT_TYPE = b"content-type"
APPLICATION_JSON = b"application/json"


def inject_content_type_middleware(app: ASGIApp) -> ASGIApp:
    """Force POST requests to have Content-Type: application/json so SDK transport security accepts them."""

    async def wrapped(scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") == "http" and scope.get("method") == "POST":
            # Build new headers: drop any existing content-type, then add application/json
            headers = [(k, v) for k, v in scope.get("headers", []) if k.lower() != CONTENT_TYPE]
            headers.append((CONTENT_TYPE, APPLICATION_JSON))
            # Must pass a new scope dict so the app sees our headers
            scope = {**scope, "headers": headers}
        await app(scope, receive, send)

    return wrapped
