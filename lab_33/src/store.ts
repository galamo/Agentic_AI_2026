import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { CreateUserInput, Gender, User } from './types';

const DATA_DIR = join(__dirname, '../data');
const USERS_FILE = join(DATA_DIR, 'users.json');

const GENDERS: Gender[] = ['male', 'female', 'other'];

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function readUsers(): User[] {
  ensureDataDir();
  if (!existsSync(USERS_FILE)) return [];
  return JSON.parse(readFileSync(USERS_FILE, 'utf-8')) as User[];
}

export function writeUsers(users: User[]): void {
  ensureDataDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function isGender(value: string): value is Gender {
  return GENDERS.includes(value as Gender);
}

export function getUsers(filter?: { gender?: string }): User[] {
  let users = readUsers();
  if (filter?.gender) {
    const g = filter.gender.toLowerCase();
    users = users.filter(u => u.gender === g);
  }
  return users;
}

export type CreateUserResult =
  | { success: true; user: User }
  | { success: false; error: string; status: number };

export function createUser(input: CreateUserInput): CreateUserResult {
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

  const user: User = { id: uuidv4(), name, email, gender };
  users.push(user);
  writeUsers(users);
  return { success: true, user };
}

export type DeleteUserResult =
  | { success: true }
  | { success: false; error: string; status: number };

export function deleteUser(id: string): DeleteUserResult {
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
