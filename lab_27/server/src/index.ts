import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {
  COURTS,
  readBookings, deleteBooking, createBooking,
  readIssues, createIssue, updateIssueStatus,
} from './store';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const issueReportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip ?? 'unknown',
  handler: (_req, res) => res.status(429).json({ error: 'Too many issue reports. Please wait a minute before trying again.' }),
});

// Courts
app.get('/api/courts', (_req: Request, res: Response) => {
  res.json(COURTS);
});

// Bookings - GET all
app.get('/api/bookings', (_req: Request, res: Response) => {
  res.json(readBookings());
});

// Bookings - POST create
app.post('/api/bookings', (req: Request, res: Response) => {
  const result = createBooking(req.body);
  if (!result.success) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ success: true, booking: result.booking, confirmationCode: result.confirmationCode });
});

// Bookings - DELETE
app.delete('/api/bookings/:id', (req: Request, res: Response) => {
  const result = deleteBooking(req.params.id);
  if (!result.success) return res.status(result.status).json({ error: result.error });
  res.json({ success: true });
});

// Issues - GET all
app.get('/api/issues', (_req: Request, res: Response) => {
  res.json(readIssues());
});

// Issues - POST create
app.post('/api/issues', issueReportLimiter, (req: Request, res: Response) => {
  const result = createIssue(req.body);
  if (!result.success) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ success: true, issue: result.issue });
});

// Issues - PATCH status
app.patch('/api/issues/:id/status', (req: Request, res: Response) => {
  const result = updateIssueStatus(req.params.id, req.body.status);
  if (!result.success) return res.status(result.status).json({ error: result.error });
  res.json({ success: true, issue: result.issue });
});

app.listen(PORT, () => {
  console.log(`\n🎾 Tennis Booking Server running on http://localhost:${PORT}\n`);
});
