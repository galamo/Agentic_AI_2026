import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const COURTS = [
  {
    id: 1,
    name: 'Court 1',
    fullName: 'Blue Hard Court',
    surface: 'hard' as const,
    colorKey: 'blue',
    location: { lat: 31.8044, lng: 34.6553, address: 'Ashdod, Area D (אזור ד)' },
  },
  {
    id: 2,
    name: 'Court 2',
    fullName: 'Clay Court',
    surface: 'clay' as const,
    colorKey: 'clay',
    location: { lat: 31.8120, lng: 34.6620, address: 'Ashdod, Area Ya (אזור י)' },
  },
  {
    id: 3,
    name: 'Court 3',
    fullName: 'Grass Court',
    surface: 'grass' as const,
    colorKey: 'grass',
    location: { lat: 31.7980, lng: 34.6500, address: 'Ashdod, Area Vav (אזור ו)' },
  },
  {
    id: 4,
    name: 'Court 4',
    fullName: 'Teal Hard Court',
    surface: 'hard' as const,
    colorKey: 'teal',
    location: { lat: 31.8070, lng: 34.6580, address: 'Ashdod, Area He (אזור ה)' },
  },
];

export interface Booking {
  id: string;
  courtId: number;
  date: string;
  startHour: number;
  endHour: number;
  userName: string;
  phone: string;
  confirmedAt: string;
}

export interface Issue {
  id: string;
  courtId: number;
  description: string;
  imageBase64: string | null;
  reporterName: string;
  reportedAt: string;
  status: 'open' | 'in-progress' | 'resolved';
}

const DATA_DIR = join(__dirname, '../data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const BOOKINGS_FILE = join(DATA_DIR, 'bookings.json');
const ISSUES_FILE = join(DATA_DIR, 'issues.json');

export function readBookings(): Booking[] {
  if (!existsSync(BOOKINGS_FILE)) return [];
  return JSON.parse(readFileSync(BOOKINGS_FILE, 'utf-8'));
}

export function writeBookings(data: Booking[]): void {
  writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2));
}

export function readIssues(): Issue[] {
  if (!existsSync(ISSUES_FILE)) return [];
  return JSON.parse(readFileSync(ISSUES_FILE, 'utf-8'));
}

export function writeIssues(data: Issue[]): void {
  writeFileSync(ISSUES_FILE, JSON.stringify(data, null, 2));
}

// ── Shared business logic ─────────────────────────────────────────────────────

export type CreateBookingInput = {
  courtId: number;
  date: string;
  startHour: number;
  endHour: number;
  userName: string;
  phone: string;
};

export type CreateBookingResult =
  | { success: true; booking: Booking; confirmationCode: string }
  | { success: false; error: string; status: number };

export function createBooking(input: CreateBookingInput): CreateBookingResult {
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
  if (!COURTS.find(c => c.id === courtId)) {
    return { success: false, error: 'Invalid court', status: 400 };
  }

  const bookings = readBookings();
  const conflict = bookings.find(
    b => b.courtId === courtId && b.date === date && !(endHour <= b.startHour || startHour >= b.endHour)
  );
  if (conflict) {
    return {
      success: false,
      error: `Court already booked from ${conflict.startHour}:00 to ${conflict.endHour}:00 by ${conflict.userName}`,
      status: 409,
    };
  }

  const booking: Booking = {
    id: uuidv4(),
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

export type DeleteBookingResult =
  | { success: true }
  | { success: false; error: string; status: number };

export function deleteBooking(id: string): DeleteBookingResult {
  let bookings = readBookings();
  const before = bookings.length;
  bookings = bookings.filter(b => b.id !== id);
  if (bookings.length === before) {
    return { success: false, error: 'Booking not found', status: 404 };
  }
  writeBookings(bookings);
  return { success: true };
}

export type CreateIssueInput = {
  courtId: number;
  description: string;
  reporterName: string;
  imageBase64?: string;
};

export type CreateIssueResult =
  | { success: true; issue: Issue }
  | { success: false; error: string; status: number };

export function createIssue(input: CreateIssueInput): CreateIssueResult {
  const { courtId, description, reporterName, imageBase64 } = input;

  if (!courtId || !description || !reporterName) {
    return { success: false, error: 'Missing required fields', status: 400 };
  }
  if (!COURTS.find(c => c.id === courtId)) {
    return { success: false, error: 'Invalid court', status: 400 };
  }

  const issues = readIssues();
  const duplicate = issues.find(
    i =>
      i.courtId === courtId &&
      i.reporterName.trim().toLowerCase() === reporterName.trim().toLowerCase() &&
      i.description.trim().toLowerCase() === description.trim().toLowerCase()
  );
  if (duplicate) {
    return {
      success: false,
      error: 'An identical issue from this reporter already exists for this court.',
      status: 409,
    };
  }

  const issue: Issue = {
    id: uuidv4(),
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

export type UpdateIssueStatusResult =
  | { success: true; issue: Issue }
  | { success: false; error: string; status: number };

export function updateIssueStatus(id: string, status: string): UpdateIssueStatusResult {
  if (!['open', 'in-progress', 'resolved'].includes(status)) {
    return { success: false, error: 'Invalid status', status: 400 };
  }

  const issues = readIssues();
  const issue = issues.find(i => i.id === id);
  if (!issue) {
    return { success: false, error: 'Issue not found', status: 404 };
  }

  issue.status = status as Issue['status'];
  writeIssues(issues);
  return { success: true, issue };
}
