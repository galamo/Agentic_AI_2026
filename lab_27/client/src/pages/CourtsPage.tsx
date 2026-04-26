import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Button, Chip, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import SportsIcon from '@mui/icons-material/Sports';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { Court, Booking, COURT_COLORS } from '../types';
import { fetchCourts, fetchBookings } from '../api';
import TennisCourtSVG from '../components/TennisCourtSVG';
import BookingDialog from '../components/BookingDialog';

const SURFACE_LABELS: Record<string, string> = { hard: 'Hard Court', clay: 'Clay Court', grass: 'Grass Court' };

function TimelineBar({ bookings, courtId, date }: { bookings: Booking[]; courtId: number; date: string }) {
  const dayBookings = bookings.filter(b => b.courtId === courtId && b.date === date);
  const hours = Array.from({ length: 14 }, (_, i) => i + 8);

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        TODAY'S SCHEDULE
      </Typography>
      <Box sx={{ display: 'flex', mt: 0.5, gap: 0.25, alignItems: 'center' }}>
        {hours.map(h => {
          const booked = dayBookings.find(b => h >= b.startHour && h < b.endHour);
          return (
            <Tooltip
              key={h}
              title={booked ? `${h}:00–${booked.endHour}:00 · ${booked.userName}` : `${h}:00 — Available`}
              arrow
            >
              <Box
                sx={{
                  flex: 1, height: 20, borderRadius: 1,
                  bgcolor: booked ? '#EF9A9A' : '#C8E6C9',
                  border: '1px solid',
                  borderColor: booked ? '#EF5350' : '#81C784',
                  cursor: 'default',
                  transition: 'transform 0.1s',
                  '&:hover': { transform: 'scaleY(1.3)' },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary">8:00</Typography>
        <Typography variant="caption" color="text.secondary">22:00</Typography>
      </Box>
    </Box>
  );
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    try {
      const [c, b] = await Promise.all([fetchCourts(), fetchBookings()]);
      setCourts(c);
      setBookings(b);
    } catch {
      setError('Failed to load courts. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleBook = (court: Court) => {
    setSelectedCourt(court);
    setDialogOpen(true);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <CircularProgress size={48} />
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 5, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <SportsIcon sx={{ fontSize: 48, color: '#F9A825' }} />
          <Typography variant="h3" fontWeight={700} color="primary">
            Book Your Court
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary" fontWeight={400}>
          4 premium courts · Open daily 8:00 – 22:00 · Hourly bookings
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Chip icon={<CalendarTodayIcon />} label={`Today: ${today}`} color="primary" variant="outlined" />
          <Chip sx={{ bgcolor: '#C8E6C9', color: '#1B5E20' }} label="Green = Available" size="small" />
          <Chip sx={{ bgcolor: '#EF9A9A', color: '#B71C1C' }} label="Red = Booked" size="small" />
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {courts.map(court => {
          const colors = COURT_COLORS[court.colorKey];
          const todayBookings = bookings.filter(b => b.courtId === court.id && b.date === today);
          const bookedHours = todayBookings.reduce((sum, b) => sum + (b.endHour - b.startHour), 0);
          const availableHours = 14 - bookedHours;

          return (
            <Grid item xs={12} sm={6} lg={3} key={court.id}>
              <Card
                sx={{
                  borderRadius: 3, overflow: 'hidden',
                  border: `2px solid ${colors.light}`,
                  '&:hover': { borderColor: colors.primary },
                }}
              >
                {/* Court image header */}
                <Box
                  sx={{
                    background: `linear-gradient(180deg, ${colors.shadow || colors.primary} 0%, ${colors.primary} 100%)`,
                    p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  <TennisCourtSVG colorKey={court.colorKey} width={280} height={175} />
                  <Box
                    sx={{
                      position: 'absolute', top: 10, left: 10,
                      bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', px: 1.5, py: 0.5,
                      borderRadius: 2, backdropFilter: 'blur(4px)',
                    }}
                  >
                    <Typography variant="caption" fontWeight={700}>{court.name}</Typography>
                  </Box>
                </Box>

                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{court.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{court.fullName}</Typography>
                    </Box>
                    <Chip
                      label={SURFACE_LABELS[court.surface]}
                      size="small"
                      sx={{ bgcolor: colors.light, color: colors.primary, fontWeight: 600 }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 16, color: '#2E7D32' }} />
                      <Typography variant="caption" color="text.secondary">
                        <b style={{ color: '#2E7D32' }}>{availableHours}h</b> available
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 16, color: '#EF5350' }} />
                      <Typography variant="caption" color="text.secondary">
                        <b style={{ color: '#EF5350' }}>{todayBookings.length}</b> booking{todayBookings.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>

                  <TimelineBar bookings={bookings} courtId={court.id} date={today} />

                  {/* Today's bookings list */}
                  {todayBookings.length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>BOOKED TODAY</Typography>
                      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {todayBookings.map(b => (
                          <Box
                            key={b.id}
                            sx={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              bgcolor: '#FFF3E0', borderRadius: 1.5, px: 1.5, py: 0.5,
                              border: '1px solid #FFCC80',
                            }}
                          >
                            <Typography variant="caption" fontWeight={600} color="#E65100">
                              {b.startHour}:00 – {b.endHour}:00
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{b.userName}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    variant="contained" fullWidth size="large"
                    onClick={() => handleBook(court)}
                    sx={{
                      background: `linear-gradient(135deg, ${colors.surface} 0%, ${colors.primary} 100%)`,
                      '&:hover': { background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary} 100%)` },
                    }}
                  >
                    Book Now
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <BookingDialog
        open={dialogOpen}
        court={selectedCourt}
        existingBookings={bookings}
        onClose={() => setDialogOpen(false)}
        onBooked={() => load()}
      />
    </Box>
  );
}
