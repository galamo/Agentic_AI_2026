# MCP Calculator Server

MCP server that exposes a **calculate two numbers** tool over **Streamable HTTP** using Express. Designed to be used from LangChain agents.

## What’s in this folder

| File       | Purpose |
|-----------|---------|
| `server.js` | MCP server: Streamable HTTP on `/mcp`, REST calculator on `/calculate` |
| `agent.js`  | LangChain agent that uses the calculator as a tool |

## Quick start

### 1. Install and start the MCP server

```bash
cd mcp
npm install
npm start
```

Server listens on **http://127.0.0.1:3100** (or `MCP_PORT` / `MCP_HOST` if set).

### 2. Run the LangChain agent (optional)

In another terminal:

```bash
cd mcp
export OPENAI_API_KEY=your-key
npm run agent
```

The agent will call the calculator tool (via `POST /calculate`) for math questions.

## Endpoints

- **POST /mcp** – MCP Streamable HTTP (for MCP clients, Cursor, etc.). Stateless; no session required.
- **POST /calculate** – REST API for the calculator. Body: `{ "a": number, "b": number, "operation": "add"|"subtract"|"multiply"|"divide" }`.
- **GET /** – Server info and endpoint list.

## Using from a LangChain agent

- **REST (simple):** Use a tool that does `POST /calculate` with `a`, `b`, `operation`. See `agent.js` for an example.
- **MCP (full):** Use the MCP SDK client with Streamable HTTP transport and connect to `http://127.0.0.1:3100/mcp` to list and call the `calculate` tool over the MCP protocol.

## Environment

- `MCP_PORT` – Port (default: 3100).
- `MCP_HOST` – Host (default: 127.0.0.1). Use `0.0.0.0` to listen on all interfaces.
- `MCP_CALCULATOR_URL` – Base URL of the calculator server (for the agent; default: http://127.0.0.1:3100).
- `OPENAI_API_KEY` – Required for the LangChain agent.
