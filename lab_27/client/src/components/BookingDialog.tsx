import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Box, Typography, Alert,
  Chip, CircularProgress, Divider, Grid,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Court, Booking, COURT_COLORS } from '../types';
import { createBooking } from '../api';

interface BookingDialogProps {
  open: boolean;
  court: Court | null;
  existingBookings: Booking[];
  onClose: () => void;
  onBooked: () => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8..22

export default function BookingDialog({ open, court, existingBookings, onClose, onBooked }: BookingDialogProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(10);
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<{ code: string; booking: Booking } | null>(null);

  useEffect(() => {
    if (open) {
      setDate(today);
      setStartHour(8);
      setEndHour(10);
      setUserName('');
      setPhone('');
      setError('');
      setConfirmation(null);
    }
  }, [open]);

  if (!court) return null;

  const colors = COURT_COLORS[court.colorKey];
  const dayBookings = existingBookings.filter(b => b.courtId === court.id && b.date === date);

  const isHourBooked = (h: number) =>
    dayBookings.some(b => h >= b.startHour && h < b.endHour);

  const availableStartHours = HOURS.slice(0, -1).filter(h => !isHourBooked(h));
  const availableEndHours = HOURS.slice(1).filter(h => h > startHour);

  const handleSubmit = async () => {
    if (!userName.trim()) { setError('Please enter your name'); return; }
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await createBooking({ courtId: court.id, date, startHour, endHour, userName: userName.trim(), phone: phone.trim() });
      setConfirmation({ code: res.confirmationCode, booking: res.booking });
      onBooked();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Booking failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.surface} 100%)`,
          color: '#fff', pb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>Book {court.name}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>{court.fullName} · {court.location.address}</Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {confirmation ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#2E7D32', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
              Booking Confirmed!
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Your court is reserved. See you on the court!
            </Typography>
            <Box sx={{ mt: 2, p: 2, bgcolor: '#E8F5E9', borderRadius: 2, border: '1px solid #A5D6A7' }}>
              <Typography variant="caption" color="text.secondary">CONFIRMATION CODE</Typography>
              <Typography variant="h5" fontWeight={700} fontFamily="monospace" color="primary">
                {confirmation.code}
              </Typography>
            </Box>
            <Box sx={{ mt: 2, textAlign: 'left', p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
              <Typography variant="body2"><b>Court:</b> {court.name} — {court.fullName}</Typography>
              <Typography variant="body2"><b>Date:</b> {confirmation.booking.date}</Typography>
              <Typography variant="body2"><b>Time:</b> {confirmation.booking.startHour}:00 – {confirmation.booking.endHour}:00</Typography>
              <Typography variant="body2"><b>Name:</b> {confirmation.booking.userName}</Typography>
              <Typography variant="body2"><b>Phone:</b> {confirmation.booking.phone}</Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

            <TextField
              label="Date" type="date" value={date}
              onChange={e => setDate(e.target.value)}
              inputProps={{ min: today }}
              InputLabelProps={{ shrink: true }} fullWidth
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select label="Start Time" value={startHour}
                  onChange={e => { const v = +e.target.value; setStartHour(v); if (endHour <= v) setEndHour(v + 1); }}
                  fullWidth
                >
                  {HOURS.slice(0, -1).map(h => (
                    <MenuItem key={h} value={h} disabled={isHourBooked(h)}>
                      {String(h).padStart(2, '0')}:00 {isHourBooked(h) ? '(booked)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select label="End Time" value={endHour}
                  onChange={e => setEndHour(+e.target.value)} fullWidth
                >
                  {availableEndHours.map(h => (
                    <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}:00</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <TextField
              label="Your Name" value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="John Smith" fullWidth
            />
            <TextField
              label="Phone Number" value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1-555-0100" fullWidth
            />

            {dayBookings.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                    BOOKED SLOTS FOR {date}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {dayBookings.map(b => (
                      <Chip
                        key={b.id} size="small"
                        label={`${b.startHour}:00–${b.endHour}:00 · ${b.userName}`}
                        sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          {confirmation ? 'Close' : 'Cancel'}
        </Button>
        {!confirmation && (
          <Button
            variant="contained" onClick={handleSubmit} disabled={loading}
            sx={{ minWidth: 140 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Booking'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
