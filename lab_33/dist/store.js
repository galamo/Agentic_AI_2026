"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readUsers = readUsers;
exports.writeUsers = writeUsers;
exports.isGender = isGender;
exports.getUsers = getUsers;
exports.createUser = createUser;
exports.deleteUser = deleteUser;
const fs_1 = require("fs");
const path_1 = require("path");
const uuid_1 = require("uuid");
const DATA_DIR = (0, path_1.join)(__dirname, '../data');
const USERS_FILE = (0, path_1.join)(DATA_DIR, 'users.json');
const GENDERS = ['male', 'female', 'other'];
function ensureDataDir() {
    if (!(0, fs_1.existsSync)(DATA_DIR))
        (0, fs_1.mkdirSync)(DATA_DIR, { recursive: true });
}
function readUsers() {
    ensureDataDir();
    if (!(0, fs_1.existsSync)(USERS_FILE))
        return [];
    return JSON.parse((0, fs_1.readFileSync)(USERS_FILE, 'utf-8'));
}
function writeUsers(users) {
    ensureDataDir();
    (0, fs_1.writeFileSync)(USERS_FILE, JSON.stringify(users, null, 2));
}
function isGender(value) {
    return GENDERS.includes(value);
}
function getUsers(filter) {
    let users = readUsers();
    if (filter?.gender) {
        const g = filter.gender.toLowerCase();
        users = users.filter(u => u.gender === g);
    }
    return users;
}
function createUser(input) {
    const name = input.name?.trim();
    const email = input.email?.trim();
    const gender = typeof input.gender === 'string' ? input.gender.toLowerCase() : '';
    if (!name || !email || !gender) {
        return { success: false, error: 'name, email, and gender are required', status: 400 };
    }
    if (!isGender(gender)) {
        return { success: false, error: 'gender must be male, female, or other', status: 400 };
    }
    const users = readUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'email already exists', status: 409 };
    }
    const user = { id: (0, uuid_1.v4)(), name, email, gender };
    users.push(user);
    writeUsers(users);
    return { success: true, user };
}
function deleteUser(id) {
    const trimmed = id?.trim();
    if (!trimmed) {
        return { success: false, error: 'user id is required', status: 400 };
    }
    const users = readUsers();
    const next = users.filter(u => u.id !== trimmed);
    if (next.length === users.length) {
        return { success: false, error: 'user not found', status: 404 };
    }
    writeUsers(next);
    return { success: true };
}
