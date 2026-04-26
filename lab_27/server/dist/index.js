"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const fs_1 = require("fs");
const path_1 = require("path");
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
const PORT = 3023;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '20mb' }));
const DATA_DIR = (0, path_1.join)(__dirname, '../data');
if (!(0, fs_1.existsSync)(DATA_DIR))
    (0, fs_1.mkdirSync)(DATA_DIR, { recursive: true });
const BOOKINGS_FILE = (0, path_1.join)(DATA_DIR, 'bookings.json');
const ISSUES_FILE = (0, path_1.join)(DATA_DIR, 'issues.json');
const COURTS = [
    {
        id: 1,
        name: 'Court 1',
        fullName: 'Blue Hard Court',
        surface: 'hard',
        colorKey: 'blue',
        location: { lat: 31.8044, lng: 34.6553, address: 'Ashdod, Area D (אזור ד)' },
    },
    {
        id: 2,
        name: 'Court 2',
        fullName: 'Clay Court',
        surface: 'clay',
        colorKey: 'clay',
        location: { lat: 31.8120, lng: 34.6620, address: 'Ashdod, Area Ya (אזור י)' },
    },
    {
        id: 3,
        name: 'Court 3',
        fullName: 'Grass Court',
        surface: 'grass',
        colorKey: 'grass',
        location: { lat: 31.7980, lng: 34.6500, address: 'Ashdod, Area Vav (אזור ו)' },
    },
    {
        id: 4,
        name: 'Court 4',
        fullName: 'Teal Hard Court',
        surface: 'hard',
        colorKey: 'teal',
        location: { lat: 31.8070, lng: 34.6580, address: 'Ashdod, Area He (אזור ה)' },
    },
];
function readBookings() {
    if (!(0, fs_1.existsSync)(BOOKINGS_FILE))
        return [];
    return JSON.parse((0, fs_1.readFileSync)(BOOKINGS_FILE, 'utf-8'));
}
function writeBookings(data) {
    (0, fs_1.writeFileSync)(BOOKINGS_FILE, JSON.stringify(data, null, 2));
}
function readIssues() {
    if (!(0, fs_1.existsSync)(ISSUES_FILE))
        return [];
    return JSON.parse((0, fs_1.readFileSync)(ISSUES_FILE, 'utf-8'));
}
function writeIssues(data) {
    (0, fs_1.writeFileSync)(ISSUES_FILE, JSON.stringify(data, null, 2));
}
const issueReportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 3,
    keyGenerator: (req) => req.ip ?? 'unknown',
    handler: (_req, res) => res.status(429).json({ error: 'Too many issue reports. Please wait a minute before trying again.' }),
});
// Courts
app.get('/api/courts', (_req, res) => {
    res.json(COURTS);
});
// Bookings - GET all
app.get('/api/bookings', (_req, res) => {
    res.json(readBookings());
});
// Bookings - POST create
app.post('/api/bookings', (req, res) => {
    const { courtId, date, startHour, endHour, userName, phone } = req.body;
    if (!courtId || !date || startHour === undefined || endHour === undefined || !userName || !phone) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (startHour < 8 || endHour > 22 || startHour >= endHour) {
        return res.status(400).json({ error: 'Invalid time range (available 8:00–22:00)' });
    }
    if (endHour - startHour < 1) {
        return res.status(400).json({ error: 'Minimum booking duration is 1 hour' });
    }
    if (!COURTS.find(c => c.id === courtId)) {
        return res.status(400).json({ error: 'Invalid court' });
    }
    const bookings = readBookings();
    const conflict = bookings.find(b => b.courtId === courtId && b.date === date && !(endHour <= b.startHour || startHour >= b.endHour));
    if (conflict) {
        return res.status(409).json({ error: `Court already booked from ${conflict.startHour}:00 to ${conflict.endHour}:00 by ${conflict.userName}` });
    }
    const newBooking = {
        id: (0, uuid_1.v4)(),
        courtId,
        date,
        startHour,
        endHour,
        userName,
        phone,
        confirmedAt: new Date().toISOString(),
    };
    bookings.push(newBooking);
    writeBookings(bookings);
    res.status(201).json({
        success: true,
        booking: newBooking,
        confirmationCode: `TC-${newBooking.id.slice(0, 8).toUpperCase()}`,
    });
});
// Bookings - DELETE
app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    let bookings = readBookings();
    const before = bookings.length;
    bookings = bookings.filter(b => b.id !== id);
    if (bookings.length === before) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    writeBookings(bookings);
    res.json({ success: true });
});
// Issues - GET all
app.get('/api/issues', (_req, res) => {
    res.json(readIssues());
});
// Issues - POST create
app.post('/api/issues', issueReportLimiter, (req, res) => {
    const { courtId, description, imageBase64, reporterName } = req.body;
    if (!courtId || !description || !reporterName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!COURTS.find(c => c.id === courtId)) {
        return res.status(400).json({ error: 'Invalid court' });
    }
    const issues = readIssues();
    const duplicate = issues.find(i => i.courtId === courtId &&
        i.reporterName.trim().toLowerCase() === reporterName.trim().toLowerCase() &&
        i.description.trim().toLowerCase() === description.trim().toLowerCase());
    if (duplicate) {
        return res.status(409).json({ error: 'An identical issue from this reporter already exists for this court.' });
    }
    const newIssue = {
        id: (0, uuid_1.v4)(),
        courtId,
        description,
        imageBase64: imageBase64 || null,
        reporterName,
        reportedAt: new Date().toISOString(),
        status: 'open',
    };
    issues.push(newIssue);
    writeIssues(issues);
    res.status(201).json({ success: true, issue: newIssue });
});
// Issues - PATCH status
app.patch('/api/issues/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['open', 'in-progress', 'resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    const issues = readIssues();
    const issue = issues.find(i => i.id === id);
    if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
    }
    issue.status = status;
    writeIssues(issues);
    res.json({ success: true, issue });
});
app.listen(PORT, () => {
    console.log(`\n🎾 Tennis Booking Server running on http://localhost:${PORT}\n`);
});
