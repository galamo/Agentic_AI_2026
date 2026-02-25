/**
 * PostgreSQL MCP server over stdio (for local / subprocess clients).
 * Run: node server-stdio.js — communicates via stdin/stdout.
 */
import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./mcp-server.js";
const transport = new StdioServerTransport(process.stdin, process.stdout);

server.onerror = (err) => {
  console.error("[postgres-mcp stdio error]", err);
};

await server.connect(transport);
// Process stays alive; stdin is read for JSON-RPC messages.
