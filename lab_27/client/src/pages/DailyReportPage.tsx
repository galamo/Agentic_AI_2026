import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert,
  TextField, Chip, Divider,
} from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Booking, Court, COURT_CHART_COLORS } from '../types';
import { fetchBookings, fetchCourts } from '../api';

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DailyReportPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    (async () => {
      try {
        const [b, c] = await Promise.all([fetchBookings(), fetchCourts()]);
        setBookings(b);
        setCourts(c);
      } catch {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const dayBookings = bookings.filter(b => b.date === selectedDate);

  const pieData = courts.map(c => {
    const cb = dayBookings.filter(b => b.courtId === c.id);
    return {
      name: c.name,
      bookings: cb.length,
      hours: cb.reduce((s, b) => s + (b.endHour - b.startHour), 0),
    };
  }).filter(d => d.bookings > 0);

  const hoursData = courts.map(c => {
    const cb = dayBookings.filter(b => b.courtId === c.id);
    return {
      name: c.name,
      value: cb.reduce((s, b) => s + (b.endHour - b.startHour), 0),
    };
  }).filter(d => d.value > 0);

  const busiest = pieData.reduce((a, b) => a.bookings > b.bookings ? a : b, pieData[0]);
  const totalHours = dayBookings.reduce((s, b) => s + (b.endHour - b.startHour), 0);
  const peakHour = (() => {
    const counts: Record<number, number> = {};
    dayBookings.forEach(b => {
      for (let h = b.startHour; h < b.endHour; h++) counts[h] = (counts[h] || 0) + 1;
    });
    const peak = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    return peak ? `${peak[0]}:00` : '—';
  })();

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <PieChartIcon sx={{ fontSize: 36, color: '#1B5E20' }} />
        <Typography variant="h4" fontWeight={700} color="primary">Daily Report</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Booking distribution and court usage for a specific day
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 4 }}>
        <TextField
          label="Select Date" type="date" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ bgcolor: '#fff', borderRadius: 2 }}
        />
      </Box>

      {dayBookings.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">No bookings on {selectedDate}</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Summary stats */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {[
                { label: 'Total Bookings', value: dayBookings.length, color: '#1565C0' },
                { label: 'Hours Booked', value: `${totalHours}h`, color: '#2E7D32' },
                { label: 'Courts Used', value: pieData.length, color: '#BF360C' },
                { label: 'Peak Hour', value: peakHour, color: '#F57F17' },
              ].map(s => (
                <Grid item xs={6} sm={3} key={s.label}>
                  <Paper sx={{ p: 2, borderRadius: 3, textAlign: 'center', borderTop: `4px solid ${s.color}` }}>
                    <Typography variant="h3" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Pie charts */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Bookings per Court</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="bookings" nameKey="name"
                    cx="50%" cy="50%" outerRadius={100}
                    labelLine={false} label={renderCustomLabel}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COURT_CHART_COLORS[courts.findIndex(c => c.name === pieData[i].name)]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Hours Used per Court</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={hoursData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={100}
                    labelLine={false} label={renderCustomLabel}
                  >
                    {hoursData.map((_, i) => (
                      <Cell key={i} fill={COURT_CHART_COLORS[courts.findIndex(c => c.name === hoursData[i].name)]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}h`, n]} contentStyle={{ borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Booking details */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              {busiest && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, p: 2, bgcolor: '#FFF9C4', borderRadius: 2 }}>
                  <EmojiEventsIcon sx={{ color: '#F9A825' }} />
                  <Typography variant="body1" fontWeight={600}>
                    Busiest court: <strong>{busiest.name}</strong> with {busiest.bookings} booking{busiest.bookings !== 1 ? 's' : ''} ({busiest.hours}h)
                  </Typography>
                </Box>
              )}
              <Typography variant="h6" fontWeight={700} mb={2}>Booking Details</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {dayBookings.sort((a, b) => a.courtId - b.courtId || a.startHour - b.startHour).map(b => {
                  const court = courts.find(c => c.id === b.courtId);
                  const idx = court ? court.id - 1 : 0;
                  return (
                    <Box
                      key={b.id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                        borderRadius: 2, border: `1px solid ${COURT_CHART_COLORS[idx]}30`,
                        bgcolor: `${COURT_CHART_COLORS[idx]}08`,
                      }}
                    >
                      <Box
                        sx={{
                          width: 12, height: 12, borderRadius: '50%',
                          bgcolor: COURT_CHART_COLORS[idx], flexShrink: 0,
                        }}
                      />
                      <Chip
                        label={court?.name} size="small"
                        sx={{ bgcolor: `${COURT_CHART_COLORS[idx]}20`, color: COURT_CHART_COLORS[idx], fontWeight: 700 }}
                      />
                      <Typography variant="body2" fontWeight={600}>{b.startHour}:00 – {b.endHour}:00</Typography>
                      <Typography variant="body2">{b.userName}</Typography>
                      <Typography variant="body2" color="text.secondary">{b.phone}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
