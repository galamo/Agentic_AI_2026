/**
 * MCP server definition: exposes a single "test" tool.
 * Single instance created at module load; reuse for all connections.
 */
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const LOG_PREFIX = "[MCP]";

const server = new McpServer(
  {
    name: "lab10-test-mcp",
    version: "1.0.0",
  }
);

server.registerTool(
  "test",
  {
    title: "Test",
    description: "A simple test tool that echoes a message. Use this to verify the MCP connection works.",
    inputSchema: {
      message: z.string().optional().describe("Optional message to echo back"),
    },
  },
  async ({ message }) => {
    // tool code 
    const text = message ? `Test tool received: ${message}` : "Test tool called successfully.";
    console.log(`${LOG_PREFIX} test called message="${message ?? "(none)"}"`);
    return {
      content: [{ type: "text", text }],
    };
  }
);

server.registerTool(
  "calculate",
  {
    title: "calculate",
    description: "sum two numbers and return the results",
    inputSchema: {
      num1: z.number().describe("first number"),
      num2: z.number().describe("second number")
    },
  },
  async ({ num1,num2 }) => {
    console.log(num1,num2, "calculate tool called")
    const result = num1 + num2;
    return {
      content: [{ type: "text", text: String(result) }],
    };
  }
);

export { server };
