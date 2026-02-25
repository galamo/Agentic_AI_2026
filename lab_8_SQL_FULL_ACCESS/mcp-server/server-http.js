/**
 * PostgreSQL MCP server over Streamable HTTP (Express).
 * POST /mcp — MCP protocol endpoint (for remote clients).
 */
import "dotenv/config";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { server } from "./mcp-server.js";

const PORT = Number(process.env.MCP_PORT || "3101");
const host = process.env.MCP_HOST || "127.0.0.1";

const app = createMcpExpressApp({ host });

app.post("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
    });
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST for MCP." },
    id: null,
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "postgres-mcp" });
});

app.listen(PORT, host, (err) => {
  if (err) {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  }
  console.log(`PostgreSQL MCP server (HTTP) at http://${host}:${PORT}`);
  console.log("  MCP endpoint: POST /mcp");
});
