"""
Lab 8 API (Python): PostgreSQL agent with full DB access via MCP (HTTP and stdio).
POST /query — uses postgres_agent_http (MCP over HTTP).
POST /query-stdio — uses postgres_agent_stdio (MCP over stdio, spawns mcp_server).
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.agents.postgres_agent_http import run_postgres_agent_http
from api.agents.postgres_agent_stdio import run_postgres_agent_stdio

app = FastAPI(title="Lab 8 SQL Full Access API (Python)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class QueryBody(BaseModel):
    question: str


@app.post("/query")
async def query(body: QueryBody):
    """PostgreSQL agent (MCP over HTTP). MCP server must be running."""
    try:
        result = await run_postgres_agent_http(body.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query-stdio")
async def query_stdio(body: QueryBody):
    """PostgreSQL agent (MCP over stdio, spawns mcp_server)."""
    try:
        result = await run_postgres_agent_stdio(body.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "3002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
