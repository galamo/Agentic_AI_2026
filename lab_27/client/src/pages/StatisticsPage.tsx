import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Paper, CircularProgress, Alert, Chip,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';
import { Booking, Court, COURT_CHART_COLORS } from '../types';
import { fetchBookings, fetchCourts } from '../api';

function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function StatisticsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const days = getLast14Days();

  // Bookings per day per court
  const bookingsData = days.map(date => {
    const entry: Record<string, string | number> = { date: date.slice(5) };
    courts.forEach(c => {
      entry[c.name] = bookings.filter(b => b.courtId === c.id && b.date === date).length;
    });
    return entry;
  });

  // Hours booked per day per court
  const hoursData = days.map(date => {
    const entry: Record<string, string | number> = { date: date.slice(5) };
    courts.forEach(c => {
      const dayBookings = bookings.filter(b => b.courtId === c.id && b.date === date);
      entry[c.name] = dayBookings.reduce((s, b) => s + (b.endHour - b.startHour), 0);
    });
    return entry;
  });

  // Summary stats
  const stats = courts.map(c => {
    const cb = bookings.filter(b => b.courtId === c.id);
    const totalHours = cb.reduce((s, b) => s + (b.endHour - b.startHour), 0);
    const avgPerDay = (cb.length / Math.max(days.length, 1)).toFixed(1);
    return { court: c, totalBookings: cb.length, totalHours, avgPerDay };
  });

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <BarChartIcon sx={{ fontSize: 36, color: '#1B5E20' }} />
        <Typography variant="h4" fontWeight={700} color="primary">Court Statistics</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Booking trends and capacity analysis — last 14 days
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary cards */}
      <Grid container spacing={2} mb={4}>
        {stats.map(s => (
          <Grid item xs={6} sm={3} key={s.court.id}>
            <Paper sx={{ p: 2, borderRadius: 3, borderTop: `4px solid ${COURT_CHART_COLORS[s.court.id - 1]}` }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.court.name}</Typography>
              <Typography variant="h4" fontWeight={700} color="primary">{s.totalBookings}</Typography>
              <Typography variant="body2" color="text.secondary">Total bookings</Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${s.totalHours}h booked`} size="small" sx={{ bgcolor: '#E8F5E9' }} />
                <Chip label={`${s.avgPerDay}/day avg`} size="small" sx={{ bgcolor: '#FFF9C4' }} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Bookings per day bar chart */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BarChartIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Bookings Per Day</Typography>
        </Box>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={bookingsData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Legend />
            {courts.map((c, i) => (
              <Bar key={c.id} dataKey={c.name} fill={COURT_CHART_COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={24} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Hours booked line chart */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Court Capacity Usage (Hours Booked)</Typography>
        </Box>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={hoursData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
            <YAxis domain={[0, 14]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}h`} />
            <Tooltip formatter={(v: number) => [`${v}h`, '']} contentStyle={{ borderRadius: 8 }} />
            <Legend />
            <ReferenceLine y={14} stroke="#EF9A9A" strokeDasharray="5 5" label={{ value: 'Max capacity', fontSize: 11 }} />
            {courts.map((c, i) => (
              <Line
                key={c.id} type="monotone" dataKey={c.name}
                stroke={COURT_CHART_COLORS[i]} strokeWidth={2.5}
                dot={{ r: 4, fill: COURT_CHART_COLORS[i] }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
