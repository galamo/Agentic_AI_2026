"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const zod_1 = require("zod");
const store_1 = require("./store");
const MCP_PORT = 3002;
// Build and register all tools onto a fresh McpServer instance.
// Called per-request in stateless mode so each request gets its own server+transport.
function buildServer() {
    const server = new mcp_js_1.McpServer({ name: 'tennis-booking', version: '1.0.0' });
    // ── Courts ──────────────────────────────────────────────────────────────────
    server.registerTool('get_courts', { description: 'List all available tennis courts with their details (name, surface, location)' }, async () => ({ content: [{ type: 'text', text: JSON.stringify(store_1.COURTS, null, 2) }] }));
    // ── Bookings ────────────────────────────────────────────────────────────────
    server.registerTool('get_bookings', { description: 'List all court bookings across all courts' }, async () => ({ content: [{ type: 'text', text: JSON.stringify((0, store_1.readBookings)(), null, 2) }] }));
    server.registerTool('create_booking', {
        description: 'Book a tennis court for a specific date and time range',
        inputSchema: {
            courtId: zod_1.z.number().int().min(1).max(4).describe('Court ID (1–4)'),
            date: zod_1.z.string().describe('Booking date in YYYY-MM-DD format'),
            startHour: zod_1.z.number().int().min(8).max(21).describe('Start hour (8–21)'),
            endHour: zod_1.z.number().int().min(9).max(22).describe('End hour (9–22), must be greater than startHour'),
            userName: zod_1.z.string().min(1).describe('Name of the player making the booking'),
            phone: zod_1.z.string().min(1).describe('Contact phone number'),
        },
    }, async (args) => {
        const result = (0, store_1.createBooking)(args);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }], isError: true };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ confirmationCode: result.confirmationCode, booking: result.booking }, null, 2),
                }],
        };
    });
    server.registerTool('delete_booking', {
        description: 'Cancel an existing booking by its ID',
        inputSchema: {
            id: zod_1.z.string().describe('Booking UUID to cancel'),
        },
    }, async ({ id }) => {
        const result = (0, store_1.deleteBooking)(id);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }], isError: true };
        }
        return { content: [{ type: 'text', text: 'Booking cancelled successfully.' }] };
    });
    // ── Issues ──────────────────────────────────────────────────────────────────
    server.registerTool('get_issues', {
        description: 'List all reported court issues, with optional filtering by courtId or status',
        inputSchema: {
            courtId: zod_1.z.number().int().min(1).max(4).optional().describe('Filter by court ID'),
            status: zod_1.z.enum(['open', 'in-progress', 'resolved']).optional().describe('Filter by issue status'),
        },
    }, async ({ courtId, status }) => {
        let issues = (0, store_1.readIssues)();
        if (courtId !== undefined)
            issues = issues.filter(i => i.courtId === courtId);
        if (status !== undefined)
            issues = issues.filter(i => i.status === status);
        return { content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }] };
    });
    server.registerTool('create_issue', {
        description: 'Report a maintenance or damage issue for a tennis court',
        inputSchema: {
            courtId: zod_1.z.number().int().min(1).max(4).describe('Court ID where the issue was found'),
            reporterName: zod_1.z.string().min(1).describe('Name of the person reporting the issue'),
            description: zod_1.z.string().min(1).describe('Description of the issue'),
            imageBase64: zod_1.z.string().optional().describe('Optional base64-encoded image of the issue'),
        },
    }, async (args) => {
        const result = (0, store_1.createIssue)(args);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result.issue, null, 2) }] };
    });
    server.registerTool('update_issue_status', {
        description: 'Update the status of a reported issue',
        inputSchema: {
            id: zod_1.z.string().describe('Issue UUID'),
            status: zod_1.z.enum(['open', 'in-progress', 'resolved']).describe('New status'),
        },
    }, async ({ id, status }) => {
        const result = (0, store_1.updateIssueStatus)(id, status);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error (${result.status}): ${result.error}` }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result.issue, null, 2) }] };
    });
    return server;
}
// ── HTTP server ──────────────────────────────────────────────────────────────
// Stateless mode: each request gets its own McpServer + transport instance.
// No session management needed — agents send a full JSON-RPC envelope per call.
const app = (0, express_1.default)();
app.use(express_1.default.json());
async function handleMcp(req, res) {
    const server = buildServer();
    const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
}
app.post('/mcp', handleMcp);
app.get('/mcp', handleMcp);
app.delete('/mcp', handleMcp);
app.listen(MCP_PORT, () => {
    console.log(`\nTennis Booking MCP server (HTTP) running on http://localhost:${MCP_PORT}/mcp\n`);
    console.log('Tools: get_courts · get_bookings · create_booking · delete_booking');
    console.log('       get_issues · create_issue · update_issue_status\n');
});
