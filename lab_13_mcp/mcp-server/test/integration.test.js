/**
 * Integration test: MCP server HTTP and tool execution (calculate, test).
 * Verifies that an MCP client can connect and call tools successfully.
 */
import http from "http";
import { describe, it } from "mocha";
import request from "supertest";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { app } from "../server-http.js";

describe("Lab 13 MCP server HTTP", () => {
  it("GET /health returns 200 and lists tools", async () => {
    await request(app)
      .get("/health")
      .expect(200)
      .expect("Content-Type", /json/)
      .expect((res) => {
        if (res.body?.ok !== true || res.body?.name !== "lab13-mcp") {
          throw new Error(`Unexpected body: ${JSON.stringify(res.body)}`);
        }
        if (!Array.isArray(res.body.tools) || !res.body.tools.includes("calculate") || !res.body.tools.includes("test")) {
          throw new Error(`Expected tools [calculate, test]: ${JSON.stringify(res.body.tools)}`);
        }
      });
  });

  it("POST /mcp — tool 'test' executes and returns expected content", async function () {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
      const client = new Client({ name: "integration-test", version: "1.0.0" }, { capabilities: {} });
      await client.connect(transport);

      const result = await client.callTool({ name: "test", arguments: {} });
      const textContent = (result.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      if (!textContent.includes("Test tool called successfully")) {
        throw new Error(`Expected success message, got: ${textContent}`);
      }

      const resultWithMessage = await client.callTool({ name: "test", arguments: { message: "hello" } });
      const textWithMessage = (resultWithMessage.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      if (!textWithMessage.includes("Test tool received: hello")) {
        throw new Error(`Expected "Test tool received: hello", got: ${textWithMessage}`);
      }

      await client.close();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("POST /mcp — tool 'calculate' executes and returns result", async function () {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
      const client = new Client({ name: "integration-test", version: "1.0.0" }, { capabilities: {} });
      await client.connect(transport);

      const result = await client.callTool({
        name: "calculate",
        arguments: { a: 10, b: 5, operation: "add" },
      });
      const textContent = (result.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      if (textContent.trim() !== "15") {
        throw new Error(`Expected "15", got: ${textContent}`);
      }

      const resultMul = await client.callTool({
        name: "calculate",
        arguments: { a: 3, b: 4, operation: "multiply" },
      });
      const textMul = (resultMul.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      if (textMul.trim() !== "12") {
        throw new Error(`Expected "12", got: ${textMul}`);
      }

      await client.close();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
