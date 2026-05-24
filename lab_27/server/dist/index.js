"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const store_1 = require("./store");
const app = (0, express_1.default)();
const PORT = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '20mb' }));
const issueReportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 3,
    keyGenerator: (req) => req.ip ?? 'unknown',
    handler: (_req, res) => res.status(429).json({ error: 'Too many issue reports. Please wait a minute before trying again.' }),
});
// Courts
app.get('/api/courts', (_req, res) => {
    res.json(store_1.COURTS);
});
// Bookings - GET all
app.get('/api/bookings', (_req, res) => {
    res.json((0, store_1.readBookings)());
});
// Bookings - POST create
app.post('/api/bookings', (req, res) => {
    const result = (0, store_1.createBooking)(req.body);
    if (!result.success)
        return res.status(result.status).json({ error: result.error });
    res.status(201).json({ success: true, booking: result.booking, confirmationCode: result.confirmationCode });
});
// Bookings - DELETE
app.delete('/api/bookings/:id', (req, res) => {
    const result = (0, store_1.deleteBooking)(req.params.id);
    if (!result.success)
        return res.status(result.status).json({ error: result.error });
    res.json({ success: true });
});
// Issues - GET all
app.get('/api/issues', (_req, res) => {
    res.json((0, store_1.readIssues)());
});
// Issues - POST create
app.post('/api/issues', issueReportLimiter, (req, res) => {
    const result = (0, store_1.createIssue)(req.body);
    if (!result.success)
        return res.status(result.status).json({ error: result.error });
    res.status(201).json({ success: true, issue: result.issue });
});
// Issues - PATCH status
app.patch('/api/issues/:id/status', (req, res) => {
    const result = (0, store_1.updateIssueStatus)(req.params.id, req.body.status);
    if (!result.success)
        return res.status(result.status).json({ error: result.error });
    res.json({ success: true, issue: result.issue });
});
app.listen(PORT, () => {
    console.log(`\n🎾 Tennis Booking Server running on http://localhost:${PORT}\n`);
});
