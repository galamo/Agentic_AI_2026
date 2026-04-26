import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, CircularProgress, Alert,
  ToggleButton, ToggleButtonGroup, IconButton, Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { Booking, Court, COURT_COLORS, COURT_CHART_COLORS } from '../types';
import { fetchBookings, fetchCourts, deleteBooking } from '../api';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([fetchBookings(), fetchCourts()]);
      setBookings(b.sort((a, z) => z.date.localeCompare(a.date) || a.startHour - z.startHour));
      setCourts(c);
    } catch {
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Cancel this booking?')) return;
    setDeleting(id);
    try {
      await deleteBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch {
      setError('Failed to cancel booking.');
    } finally {
      setDeleting(null);
    }
  };

  const courtName = (id: number) => courts.find(c => c.id === id)?.name ?? `Court ${id}`;
  const courtColor = (id: number) => {
    const court = courts.find(c => c.id === id);
    return court ? COURT_COLORS[court.colorKey] : null;
  };

  const filtered = filter ? bookings.filter(b => b.courtId === filter) : bookings;
  const today = new Date().toISOString().split('T')[0];

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <CalendarMonthIcon sx={{ fontSize: 36, color: '#1B5E20' }} />
        <Typography variant="h4" fontWeight={700} color="primary">All Bookings</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Refresh">
          <IconButton onClick={load} color="primary"><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {bookings.length} total booking{bookings.length !== 1 ? 's' : ''} across all courts
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Court filter */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
          FILTER BY COURT
        </Typography>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => setFilter(v)}
          sx={{ flexWrap: 'wrap', gap: 0.5 }}
        >
          <ToggleButton value={null} sx={{ borderRadius: '20px !important', px: 2, border: '1px solid #ccc !important' }}>
            All Courts
          </ToggleButton>
          {courts.map(c => (
            <ToggleButton
              key={c.id}
              value={c.id}
              sx={{
                borderRadius: '20px !important',
                px: 2,
                border: `1px solid ${COURT_CHART_COLORS[c.id - 1]} !important`,
                '&.Mui-selected': {
                  bgcolor: `${COURT_CHART_COLORS[c.id - 1]}20`,
                  color: COURT_CHART_COLORS[c.id - 1],
                },
              }}
            >
              {c.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1B5E20' }}>
                {['Court', 'Date', 'Time', 'Duration', 'Player', 'Phone', 'Status', 'Action'].map(h => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b, i) => {
                  const colors = courtColor(b.courtId);
                  const isToday = b.date === today;
                  const isPast = b.date < today;
                  return (
                    <TableRow
                      key={b.id}
                      sx={{
                        bgcolor: i % 2 === 0 ? 'rgba(0,0,0,0.01)' : '#fff',
                        '&:hover': { bgcolor: '#F1F8E9' },
                        opacity: isPast ? 0.65 : 1,
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={courtName(b.courtId)}
                          size="small"
                          sx={{
                            bgcolor: colors?.light ?? '#eee',
                            color: colors?.primary ?? '#333',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={isToday ? 700 : 400}>
                          {b.date}
                          {isToday && <Chip label="Today" size="small" color="success" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {b.startHour}:00 – {b.endHour}:00
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{b.endHour - b.startHour}h</Typography>
                      </TableCell>
                      <TableCell>{b.userName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{b.phone}</TableCell>
                      <TableCell>
                        <Chip
                          label={isPast ? 'Past' : isToday ? 'Today' : 'Upcoming'}
                          size="small"
                          color={isPast ? 'default' : isToday ? 'success' : 'primary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {!isPast && (
                          <Tooltip title="Cancel booking">
                            <IconButton
                              size="small" color="error"
                              onClick={() => handleDelete(b.id)}
                              disabled={deleting === b.id}
                            >
                              {deleting === b.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
