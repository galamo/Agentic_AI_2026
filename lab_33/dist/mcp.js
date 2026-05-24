"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMcpRequest = handleMcpRequest;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const zod_1 = require("zod");
const store_1 = require("./store");
function buildMcpServer() {
    const server = new mcp_js_1.McpServer({ name: 'lab-33-users', version: '1.0.0' });
    server.registerTool('get_users', {
        description: 'GET /users — list all users, optionally filtered by gender',
        inputSchema: {
            gender: zod_1.z
                .enum(['male', 'female', 'other'])
                .optional()
                .describe('Filter users by gender'),
        },
    }, async ({ gender }) => ({
        content: [{ type: 'text', text: JSON.stringify((0, store_1.getUsers)(gender ? { gender } : undefined), null, 2) }],
    }));
    server.registerTool('create_user', {
        description: 'POST /user — create a new user',
        inputSchema: {
            name: zod_1.z.string().min(1).describe('User display name'),
            email: zod_1.z.string().min(1).describe('User email (must be unique)'),
            gender: zod_1.z.enum(['male', 'female', 'other']).describe('User gender'),
        },
    }, async (args) => {
        const result = (0, store_1.createUser)(args);
        if (!result.success) {
            return {
                content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }],
                isError: true,
            };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result.user, null, 2) }] };
    });
    server.registerTool('delete_user', {
        description: 'DELETE /user — remove a user by id',
        inputSchema: {
            id: zod_1.z.string().min(1).describe('User id to delete'),
        },
    }, async ({ id }) => {
        const result = (0, store_1.deleteUser)(id);
        if (!result.success) {
            return {
                content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }],
                isError: true,
            };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
    });
    server.registerTool('update_user', {
        description: 'PUT /user — UPDATE USER BY ID',
        inputSchema: {
            id: zod_1.z.string().min(1).describe('User id to Update'),
        },
    }, async ({ id }) => {
        const result = (0, store_1.deleteUser)(id);
        if (!result.success) {
            return {
                content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }],
                isError: true,
            };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }] };
    });
    return server;
}
async function handleMcpRequest(req, res) {
    const mcpServer = buildMcpServer();
    const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
}
