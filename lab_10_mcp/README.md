# Lab 10: MCP over HTTP + Agent

This lab has:

1. **MCP server** — Exposes a single tool `test` over HTTP using `@modelcontextprotocol/sdk` and Express.
2. **Agent** — Connects to the MCP via HTTP, loads tools from the MCP, and can answer questions such as *"What kind of tools do you have?"* based on the tools provided by the MCP.

## Prerequisites

- Node.js 18+
- `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `.env` (for the agent)

## Quick start

### 1. Start the MCP server

```bash
cd lab_10_mcp/mcp-server
npm install
npm run start
```

Server runs at **http://127.0.0.1:3110** (POST `/mcp` for MCP, GET `/health` for health).

### 2. Start the agent API (or run from CLI)

**Option A — API**

```bash
cd lab_10_mcp/agent
npm install
npm run start
```

Then:

```bash
curl -X POST http://localhost:3010/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What kind of tools do you have?"}'
```

**Option B — CLI**

```bash
cd lab_10_mcp/agent
npm install
npm run ask -- "What kind of tools do you have?"
```

The agent connects to the MCP over HTTP, fetches the list of tools (e.g. `test`), and uses that to answer. So when you ask *"What kind of tools do you have?"*, the agent will describe the tools it got from the MCP (e.g. the `test` tool).

## Environment

| Variable | Where | Default | Description |
|----------|--------|---------|-------------|
| `MCP_PORT` | mcp-server | `3110` | MCP HTTP server port |
| `MCP_HOST` | mcp-server | `127.0.0.1` | MCP bind address |
| `MCP_URL` | agent | `http://127.0.0.1:3110/mcp` | MCP endpoint for the agent |
| `PORT` | agent | `3010` | Agent API port |
| `OPENAI_API_KEY` or `OPENROUTER_API_KEY` | agent | — | Required for the LLM |
| `VERBOSE` | agent | — | Set to see agent step logs |

## Structure

```
lab_10_mcp/
├── README.md
├── mcp-server/
│   ├── package.json
│   ├── mcp-server.js    # MCP server with "test" tool
│   └── server-http.js   # Express + Streamable HTTP
└── agent/
    ├── package.json
    ├── index.js         # Express API (POST /chat)
    ├── run-agent.js     # CLI: npm run ask -- "question"
    ├── lib/
    │   └── mcp-tools.js # MCP client → LangChain tools
    └── agents/
        └── mcp-agent.js # Connect to MCP via HTTP, run agent
```
