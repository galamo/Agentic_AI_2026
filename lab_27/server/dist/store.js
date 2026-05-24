"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COURTS = void 0;
exports.readBookings = readBookings;
exports.writeBookings = writeBookings;
exports.readIssues = readIssues;
exports.writeIssues = writeIssues;
exports.createBooking = createBooking;
exports.deleteBooking = deleteBooking;
exports.createIssue = createIssue;
exports.updateIssueStatus = updateIssueStatus;
const fs_1 = require("fs");
const path_1 = require("path");
const uuid_1 = require("uuid");
exports.COURTS = [
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
const DATA_DIR = (0, path_1.join)(__dirname, '../data');
if (!(0, fs_1.existsSync)(DATA_DIR))
    (0, fs_1.mkdirSync)(DATA_DIR, { recursive: true });
const BOOKINGS_FILE = (0, path_1.join)(DATA_DIR, 'bookings.json');
const ISSUES_FILE = (0, path_1.join)(DATA_DIR, 'issues.json');
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
function createBooking(input) {
    const { courtId, date, startHour, endHour, userName, phone } = input;
    if (!courtId || !date || startHour === undefined || endHour === undefined || !userName || !phone) {
        return { success: false, error: 'Missing required fields', status: 400 };
    }
    if (startHour < 8 || endHour > 22 || startHour >= endHour) {
        return { success: false, error: 'Invalid time range (available 8:00–22:00)', status: 400 };
    }
    if (endHour - startHour < 1) {
        return { success: false, error: 'Minimum booking duration is 1 hour', status: 400 };
    }
    if (!exports.COURTS.find(c => c.id === courtId)) {
        return { success: false, error: 'Invalid court', status: 400 };
    }
    const bookings = readBookings();
    const conflict = bookings.find(b => b.courtId === courtId && b.date === date && !(endHour <= b.startHour || startHour >= b.endHour));
    if (conflict) {
        return {
            success: false,
            error: `Court already booked from ${conflict.startHour}:00 to ${conflict.endHour}:00 by ${conflict.userName}`,
            status: 409,
        };
    }
    const booking = {
        id: (0, uuid_1.v4)(),
        courtId,
        date,
        startHour,
        endHour,
        userName: userName.trim(),
        phone: phone.trim(),
        confirmedAt: new Date().toISOString(),
    };
    bookings.push(booking);
    writeBookings(bookings);
    return {
        success: true,
        booking,
        confirmationCode: `TC-${booking.id.slice(0, 8).toUpperCase()}`,
    };
}
function deleteBooking(id) {
    let bookings = readBookings();
    const before = bookings.length;
    bookings = bookings.filter(b => b.id !== id);
    if (bookings.length === before) {
        return { success: false, error: 'Booking not found', status: 404 };
    }
    writeBookings(bookings);
    return { success: true };
}
function createIssue(input) {
    const { courtId, description, reporterName, imageBase64 } = input;
    if (!courtId || !description || !reporterName) {
        return { success: false, error: 'Missing required fields', status: 400 };
    }
    if (!exports.COURTS.find(c => c.id === courtId)) {
        return { success: false, error: 'Invalid court', status: 400 };
    }
    const issues = readIssues();
    const duplicate = issues.find(i => i.courtId === courtId &&
        i.reporterName.trim().toLowerCase() === reporterName.trim().toLowerCase() &&
        i.description.trim().toLowerCase() === description.trim().toLowerCase());
    if (duplicate) {
        return {
            success: false,
            error: 'An identical issue from this reporter already exists for this court.',
            status: 409,
        };
    }
    const issue = {
        id: (0, uuid_1.v4)(),
        courtId,
        description,
        imageBase64: imageBase64 || null,
        reporterName,
        reportedAt: new Date().toISOString(),
        status: 'open',
    };
    issues.push(issue);
    writeIssues(issues);
    return { success: true, issue };
}
function updateIssueStatus(id, status) {
    if (!['open', 'in-progress', 'resolved'].includes(status)) {
        return { success: false, error: 'Invalid status', status: 400 };
    }
    const issues = readIssues();
    const issue = issues.find(i => i.id === id);
    if (!issue) {
        return { success: false, error: 'Issue not found', status: 404 };
    }
    issue.status = status;
    writeIssues(issues);
    return { success: true, issue };
}
