import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardMedia,
  Chip, CircularProgress, Alert, Select, MenuItem, FormControl,
  InputLabel, Button, Menu, IconButton, Tooltip,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Issue, Court, COURT_COLORS } from '../types';
import { fetchIssues, fetchCourts, updateIssueStatus } from '../api';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#C62828', bg: '#FFEBEE' },
  'in-progress': { label: 'In Progress', color: '#E65100', bg: '#FFF3E0' },
  resolved: { label: 'Resolved', color: '#2E7D32', bg: '#E8F5E9' },
};

function IssueCard({ issue, court, onStatusChange }: {
  issue: Issue; court: Court | undefined; onStatusChange: (id: string, status: Issue['status']) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const colors = court ? COURT_COLORS[court.colorKey] : null;
  const status = STATUS_CONFIG[issue.status];
  const date = new Date(issue.reportedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Card sx={{ borderRadius: 3, border: `1px solid ${colors?.light ?? '#eee'}`, height: '100%' }}>
      {issue.imageBase64 && (
        <CardMedia
          component="img"
          height={180}
          image={issue.imageBase64}
          alt="Issue photo"
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {court && (
              <Chip
                label={court.name} size="small"
                sx={{ bgcolor: colors?.light, color: colors?.primary, fontWeight: 700 }}
              />
            )}
            <Chip
              label={status.label} size="small"
              sx={{ bgcolor: status.bg, color: status.color, fontWeight: 700 }}
            />
          </Box>
          <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl} open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { borderRadius: 2 } }}
          >
            {(['open', 'in-progress', 'resolved'] as Issue['status'][]).map(s => (
              <MenuItem
                key={s}
                onClick={() => { onStatusChange(issue.id, s); setAnchorEl(null); }}
                sx={{ fontSize: 14, color: STATUS_CONFIG[s].color }}
              >
                Mark as {STATUS_CONFIG[s].label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Typography variant="body1" sx={{ mb: 1, lineHeight: 1.5 }}>{issue.description}</Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {issue.reporterName}
          </Typography>
          <Typography variant="caption" color="text.secondary">{date}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function IssueReportsPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCourt, setFilterCourt] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<Issue['status'] | 'all'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const [is, cs] = await Promise.all([fetchIssues(), fetchCourts()]);
      setIssues(is.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()));
      setCourts(cs);
    } catch {
      setError('Failed to load issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: string, status: Issue['status']) => {
    try {
      await updateIssueStatus(id, status);
      setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } catch {
      setError('Failed to update status.');
    }
  };

  const filtered = issues.filter(i => {
    if (filterCourt !== 'all' && i.courtId !== filterCourt) return false;
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    open: issues.filter(i => i.status === 'open').length,
    'in-progress': issues.filter(i => i.status === 'in-progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <BugReportIcon sx={{ fontSize: 36, color: '#C62828' }} />
        <Typography variant="h4" fontWeight={700} color="primary">Issue Reports</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Refresh">
          <IconButton onClick={load} color="primary"><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage and track all reported court issues
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([s, n]) => (
          <Paper key={s} sx={{ px: 2.5, py: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_CONFIG[s as Issue['status']].color }} />
            <Typography variant="body2" fontWeight={700}>{n}</Typography>
            <Typography variant="body2" color="text.secondary">{STATUS_CONFIG[s as Issue['status']].label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Court</InputLabel>
          <Select value={filterCourt} onChange={e => setFilterCourt(e.target.value as number | 'all')} label="Court">
            <MenuItem value="all">All Courts</MenuItem>
            {courts.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value as Issue['status'] | 'all')} label="Status">
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="in-progress">In Progress</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
          <BugReportIcon sx={{ fontSize: 64, color: '#E0E0E0', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No issues found</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filtered.map(issue => (
            <Grid item xs={12} sm={6} md={4} key={issue.id}>
              <IssueCard
                issue={issue}
                court={courts.find(c => c.id === issue.courtId)}
                onStatusChange={handleStatusChange}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
