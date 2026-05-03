"""
Serve the lab_9_multi_agent Vite client from client/dist and optionally proxy API routes
to the Node multi-agent server (LAB9_BACKEND_URL).
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles

# lab_9_multi_agent/client/dist
CLIENT_DIST = Path(__file__).resolve().parent.parent / "client" / "dist"

BACKEND = os.getenv("LAB9_BACKEND_URL", "http://127.0.0.1:3002").rstrip("/")
PROXY_TIMEOUT = float(os.getenv("LAB9_PROXY_TIMEOUT", "300"))

app = FastAPI(title="Lab 9 Multi-Agent — static + API proxy")


async def _proxy(request: Request, path: str) -> Response:
    url = f"{BACKEND}{path}"
    headers = {}
    auth = request.headers.get("authorization")
    if auth:
        headers["authorization"] = auth
    ct = request.headers.get("content-type")
    if ct:
        headers["content-type"] = ct

    body = await request.body()
    async with httpx.AsyncClient(timeout=PROXY_TIMEOUT) as client:
        r = await client.request(
            request.method,
            url,
            content=body if body else None,
            headers=headers or None,
        )

    out_headers = {
        k: v
        for k, v in r.headers.items()
        if k.lower() not in ("transfer-encoding", "connection")
    }
    return Response(content=r.content, status_code=r.status_code, headers=out_headers)


@app.post("/login")
async def proxy_login(request: Request) -> Response:
    return await _proxy(request, "/login")


@app.post("/query")
async def proxy_query(request: Request) -> Response:
    return await _proxy(request, "/query")


@app.api_route("/health", methods=["GET", "HEAD"])
async def proxy_health(request: Request) -> Response:
    return await _proxy(request, "/health")


if not CLIENT_DIST.is_dir():
    raise RuntimeError(
        f"Missing client build at {CLIENT_DIST}. Run: cd client && npm install && npm run build"
    )

app.mount(
    "/",
    StaticFiles(directory=str(CLIENT_DIST), html=True),
    name="static",
)
