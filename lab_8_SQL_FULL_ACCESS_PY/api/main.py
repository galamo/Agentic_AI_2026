"""
Lab 8 API (Python): PostgreSQL agent with full DB access via MCP (HTTP and stdio).
POST /query — uses postgres_agent_http (MCP over HTTP).
POST /query-stdio — uses postgres_agent_stdio (MCP over stdio, spawns mcp_server).
"""
import logging
import os
from fastapi import FastAPI, HTTPException

logger = logging.getLogger(__name__)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.agents.postgres_agent_http import run_postgres_agent_http
from api.agents.postgres_agent_stdio import run_postgres_agent_stdio

app = FastAPI(title="Lab 8 SQL Full Access API (Python)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class QueryBody(BaseModel):
    question: str


def _detail_from_exception(e: BaseException) -> str:
    """Unwrap ExceptionGroup (e.g. from asyncio.TaskGroup) so the real error is shown."""
    if isinstance(e, BaseExceptionGroup) and e.exceptions:
        first = e.exceptions[0]
        return f"{type(first).__name__}: {first}"
    return f"{type(e).__name__}: {e}"


@app.post("/query")
async def query(body: QueryBody):
    """PostgreSQL agent (MCP over HTTP). MCP server must be running."""
    try:
        result = await run_postgres_agent_http(body.question)
        return result
    except Exception as e:
        logger.exception("POST /query failed")
        detail = _detail_from_exception(e)
        raise HTTPException(status_code=500, detail=detail)


@app.post("/query-stdio")
async def query_stdio(body: QueryBody):
    """PostgreSQL agent (MCP over stdio, spawns mcp_server)."""
    try:
        result = await run_postgres_agent_stdio(body.question)
        return result
    except Exception as e:
        logger.exception("POST /query-stdio failed")
        detail = _detail_from_exception(e)
        raise HTTPException(status_code=500, detail=detail)


@app.get("/health")
def health():
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "3002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
