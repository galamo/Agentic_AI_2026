import axios from 'axios';
import { Booking, BookingResponse, Court, Issue } from '../types';

const api = axios.create({ baseURL: '/api' });

export const fetchCourts = (): Promise<Court[]> =>
  api.get<Court[]>('/courts').then(r => r.data);

export const fetchBookings = (): Promise<Booking[]> =>
  api.get<Booking[]>('/bookings').then(r => r.data);

export const createBooking = (payload: {
  courtId: number;
  date: string;
  startHour: number;
  endHour: number;
  userName: string;
  phone: string;
}): Promise<BookingResponse> =>
  api.post<BookingResponse>('/bookings', payload).then(r => r.data);

export const deleteBooking = (id: string): Promise<void> =>
  api.delete(`/bookings/${id}`).then(() => undefined);

export const fetchIssues = (): Promise<Issue[]> =>
  api.get<Issue[]>('/issues').then(r => r.data);

export const createIssue = (payload: {
  courtId: number;
  description: string;
  imageBase64?: string | null;
  reporterName: string;
}): Promise<{ success: boolean; issue: Issue }> =>
  api.post('/issues', payload).then(r => r.data);

export const updateIssueStatus = (
  id: string,
  status: Issue['status']
): Promise<{ success: boolean; issue: Issue }> =>
  api.patch(`/issues/${id}/status`, { status }).then(r => r.data);
