"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mcp_1 = require("./mcp");
const store_1 = require("./store");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3333;
app.use(express_1.default.json());
app.post('/mcp', mcp_1.handleMcpRequest);
app.get('/mcp', mcp_1.handleMcpRequest);
app.delete('/mcp', mcp_1.handleMcpRequest);
app.get('/users', (req, res) => {
    const gender = typeof req.query.gender === 'string' ? req.query.gender : undefined;
    res.json((0, store_1.getUsers)(gender ? { gender } : undefined));
});
app.post('/user', (req, res) => {
    const result = (0, store_1.createUser)(req.body);
    if (!result.success)
        return res.status(result.status).json({ error: result.error });
    res.status(201).json(result.user);
});
app.delete('/user', (req, res) => {
    const id = (typeof req.query.id === 'string' ? req.query.id : undefined) ??
        (typeof req.body?.id === 'string' ? req.body.id : undefined);
    const result = (0, store_1.deleteUser)(id ?? '');
    if (!result.success)
        return res.status(result.status).json({ error: result.error });
    res.json({ success: true });
});
app.listen(PORT, () => {
    console.log(`lab_33 users API http://localhost:${PORT}`);
    console.log(`lab_33 MCP       http://localhost:${PORT}/mcp`);
    console.log('MCP tools: get_users · create_user · delete_user');
});
