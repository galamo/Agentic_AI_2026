# Lab 13 — MCP server (calculate + test tools)

Node.js Express MCP server with two tools: **calculate** and **test**. Uses Streamable HTTP so you can connect from another machine (MCP client) and from **n8n** as an agent tool.

## Tools and payload

| Tool        | Description                    | Payload (MCP `tools/call` arguments) |
|------------|--------------------------------|--------------------------------------|
| `calculate` | Math on two numbers           | `{ "a": number, "b": number, "operation": "add" \| "subtract" \| "multiply" \| "divide" }` |
| `test`      | Echo a message (connection check) | `{ "message"?: string }` (optional) |

Example JSON-RPC call (what an MCP client sends to `POST /mcp`):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": { "a": 10, "b": 5, "operation": "add" }
  }
}
```

## Run the server

```bash
cd lab_13_mcp/mcp-server
cp .env.example .env   # optional: edit MCP_HOST / MCP_PORT
npm install
npm start
```

Default: **http://0.0.0.0:3513** (all interfaces), so other systems can connect.

- **MCP endpoint:** `POST http://<host>:3513/mcp`
- **Health:** `GET http://<host>:3513/health`
- **Discovery:** `GET http://<host>:3513/`

## Connect from another system (MCP client)

From a different machine or app using an MCP client (e.g. Node with `@modelcontextprotocol/sdk`):

1. Use the **Streamable HTTP** transport.
2. Set the server URL to: **`http://<lab13-server-ip>:3513/mcp`**  
   Example: `http://192.168.1.100:3513/mcp` if this server runs on `192.168.1.100`.
3. Ensure firewall allows TCP port **3513** on the server host.

Example (Node MCP client):

```js
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(new URL("http://<server-ip>:3513/mcp"));
const client = new Client({ name: "my-app", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);

const result = await client.callTool({ name: "test", arguments: { message: "hello" } });
const result2 = await client.callTool({ name: "calculate", arguments: { a: 2, b: 3, operation: "add" } });
```

## Use with n8n (agent tool)

1. In n8n, add an **MCP** or **AI Agent** node that supports MCP servers.
2. Set the MCP server URL to: **`http://<host>:3513/mcp`**
   - If n8n runs on the **same machine**: `http://localhost:3513/mcp`
   - If n8n runs in **Docker** (e.g. host network): `http://localhost:3513/mcp`
   - If n8n runs on **another machine**: `http://<lab13-server-ip>:3513/mcp`
3. The agent will see the **calculate** and **test** tools and can call them.

If n8n is in Docker and the MCP server is on the host, use the host’s IP or `host.docker.internal` (e.g. `http://host.docker.internal:3513/mcp`) instead of `localhost`.

## Tests

```bash
cd lab_13_mcp/mcp-server
npm test
```

Tests start the HTTP app, connect with the official MCP client, and call both **test** and **calculate** to ensure the server works for remote MCP clients.
