# Lab 16: Mermaid MCP Agent (Python + LangGraph)

This lab builds a LangGraph agent that connects to the **Mermaid MCP** server and exposes its MCP tools to an LLM tool-calling loop.

## What it does

1. Connects to `https://mcp.mermaid.ai/mcp` using the `Authorization` header from `MCP_MERMAID_AUTH`.
2. Calls `tools/list` to discover the available Mermaid MCP tools and their input schemas.
3. Converts each MCP tool schema into a dynamic LangChain `StructuredTool`.
4. Uses an LLM to decide which Mermaid MCP tool to call (tool loop).
5. Returns the final answer (typically Mermaid diagram code) to the console.

## Setup

1. Create an `.env` file (or set env vars) with:
   - `MCP_MERMAID_AUTH` (optional; fallback reads it from repo `mcp.json`)
   - `OPENAI_API_KEY` and/or `OPENROUTER_API_KEY` (required for the LLM)
2. Install dependencies:

```bash
cd lab_16_mermaid_agent_py
pip install -r requirements.txt
```

## Run

```bash
cd lab_16_mermaid_agent_py
python main.py "Draw a flowchart for user login"
```

If you don't pass a prompt, it uses a default diagram request.

## Notes

- The MCP tool result extraction is best-effort; some tools may return structured content instead of plain text.
- Tool schemas are converted from MCP `inputSchema` JSON schema to Pydantic models at runtime.
