/**
 * Integration test: MCP server HTTP app and tool execution.
 */
import http from "http";
import { describe, it } from "mocha";
import request from "supertest";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { app } from "../server-http.js";

describe("MCP server HTTP", () => {
  it("GET /health returns 200 and { ok: true, name: 'lab10-test-mcp' }", async () => {
    await request(app)
      .get("/health")
      .expect(200)
      .expect("Content-Type", /json/)
      .expect((res) => {
        if (res.body?.ok !== true || res.body?.name !== "lab10-test-mcp") {
          throw new Error(`Unexpected body: ${JSON.stringify(res.body)}`);
        }
      });
  });

  it("POST /mcp — tool 'test' executes and returns expected content", async function () {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const transport = new StreamableHTTPClientTransport(`${baseUrl}/mcp`);
      const client = new Client(
        { name: "integration-test", version: "1.0.0" },
        { capabilities: {} }
      );
      await client.connect(transport);

      const result = await client.callTool({ name: "test", arguments: {} });
      const textContent = (result.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      if (!textContent.includes("Test tool called successfully.")) {
        throw new Error(`Expected "Test tool called successfully.", got: ${textContent}`);
      }

      const resultWithMessage = await client.callTool({
        name: "test",
        arguments: { message: "hello" },
      });
      const textWithMessage = (resultWithMessage.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      if (!textWithMessage.includes("Test tool received: hello")) {
        throw new Error(
          `Expected "Test tool received: hello", got: ${textWithMessage}`
        );
      }

      await client.close();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});



// curl -X POST http://localhost:3000/mcp \
//   -H "Content-Type: application/json" \
//   -H "Accept: application/json, text/event-stream" \
//   -d '{
//     "jsonrpc": "2.0",
//     "id": 1,
//     "method": "getUserByEmail",
//     "params": {
//       "email": "test@test.com"
//     }
//   }'

// home-center.com
// home-center.com/api/products REST 
// home-center.com/mcp POST // json-rpc { method: "getUserByEmail", params: { email: "test@test.com" } }