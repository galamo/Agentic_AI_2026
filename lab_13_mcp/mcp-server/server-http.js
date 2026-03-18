/**
 * Lab 13 MCP server over Streamable HTTP (Express).
 * Binds to 0.0.0.0 by default so MCP clients and n8n on other systems can connect.
 *
 * Endpoint: POST /mcp (JSON-RPC over Streamable HTTP)
 * Use URL: http://<this-machine-ip>:3513/mcp
 */
import "dotenv/config";
import { fileURLToPath } from "url";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { server } from "./mcp-server.js";

const __filename = fileURLToPath(import.meta.url);
const PORT = Number(process.env.MCP_PORT || "3513");
const host = process.env.MCP_HOST || "0.0.0.0";

const app = createMcpExpressApp({ host });

app.use((req,res,next)=>{
  console.log(req.url)
  console.log(req.method)
  next()
})
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
  console.log("something went wrong")
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST for MCP." },
    id: null,
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "lab13-mcp", tools: ["calculate", "test"] });
});

// Discovery: list tools and base URL for n8n / MCP clients
// app.get("/", (_req, res) => {
//   res.json({
//     name: "lab13-mcp",
//     version: "1.0.0",
//     mcpEndpoint: "POST /mcp",
//     tools: [
//       {
//         name: "calculate",
//         description: "Performs add, subtract, multiply, or divide on two numbers.",
//         arguments: { a: "number", b: "number", operation: "add|subtract|multiply|divide" },
//       },
//       {
//         name: "test",
//         description: "Echoes a message to verify MCP connection.",
//         arguments: { message: "string (optional)" },
//       },
//     ],
//   });
// });

if (process.argv[1] === __filename) {
  app.listen(PORT, host, (err) => {
    if (err) {
      console.error("Failed to start MCP server:", err);
      process.exit(1);
    }
    console.log(`Lab 13 MCP server at http://${host}:${PORT}`);
    console.log("  MCP endpoint: POST /mcp (use this URL in MCP client or n8n)");
    console.log("  Health:       GET /health");
  });
}

export { app };
