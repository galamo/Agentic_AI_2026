/**
 * MCP Server: Calculator tool over Streamable HTTP (Express)
 *
 * Exposes a "calculate" tool that takes two numbers and an operation (add, subtract, multiply, divide).
 * Accessible via:
 * - MCP Streamable HTTP at POST/GET/DELETE /mcp (for MCP clients and LangChain MCP tool loading)
 * - Convenience REST endpoint POST /calculate for simple LangChain HTTP tools
 */

import { z } from "zod";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const PORT = process.env.MCP_PORT || 3100;

// Shared calculator logic (used by both MCP tool and REST endpoint)
function calculate(a, b, operation) {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isNaN(numA) || Number.isNaN(numB)) {
    throw new Error("Both arguments must be numbers");
  }
  switch (operation) {
    case "add":
      return numA + numB;
    case "subtract":
      return numA - numB;
    case "multiply":
      return numA * numB;
    case "divide":
      if (numB === 0) throw new Error("Division by zero");
      return numA / numB;
    default:
      throw new Error(`Unknown operation: ${operation}. Use add, subtract, multiply, or divide.`);
  }
}

function getServer() {
  const server = new McpServer(
    {
      name: "mcp-calculator",
      version: "1.0.0",
    },
    { capabilities: { tools: { listChanged: true } } }
  );

  server.registerTool(
    "calculate",
    {
      title: "Calculate two numbers",
      description:
        "Performs a math operation on two numbers. Use for addition, subtraction, multiplication, or division.",
      inputSchema: {
        a: z.number().describe("First number"),
        b: z.number().describe("Second number"),
        operation: z
          .enum(["add", "subtract", "multiply", "divide"])
          .describe("Operation: add, subtract, multiply, or divide"),
      },
      outputSchema: {
        result: z.number(),
        operation: z.string(),
        a: z.number(),
        b: z.number(),
      },
    },
    async ({ a, b, operation }) => {
      const result = calculate(a, b, operation);
      return {
        content: [
          {
            type: "text",
            text: String(result),
          },
        ],
        structuredContent: { result, operation, a, b },
      }
    }
  );

  return server;
}

// Bind to 127.0.0.1 by default (use MCP_HOST=0.0.0.0 for all interfaces)
const app = createMcpExpressApp({ host: process.env.MCP_HOST || "127.0.0.1" });

// ----- MCP Streamable HTTP (for MCP clients and LangChain MCP integration) -----
app.post("/mcp", async (req, res) => {
  const server = getServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
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

app.delete("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed (stateless server)." },
    id: null,
  });
});

// ----- Convenience REST endpoint for LangChain HTTP tools -----
// (createMcpExpressApp already uses express.json())
app.post("/calculate", (req, res) => {
  try {
    const { a, b, operation } = req.body || {};
    const result = calculate(a, b, operation);
    res.json({ result, operation, a: Number(a), b: Number(b) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Health / tool description for discovery
app.get("/", (_req, res) => {
  res.json({
    name: "mcp-calculator",
    version: "1.0.0",
    mcp: "POST /mcp (Streamable HTTP)",
    rest: "POST /calculate { \"a\": number, \"b\": number, \"operation\": \"add\"|\"subtract\"|\"multiply\"|\"divide\" }",
  });
});

const host = process.env.MCP_HOST || "127.0.0.1";
app.listen(PORT, host, (err) => {
  if (err) {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  }
  console.log(`MCP Calculator server listening on http://${host}:${PORT}`);
  console.log("  MCP (Streamable HTTP): POST/GET/DELETE /mcp");
  console.log("  REST calculator:       POST /calculate");
});