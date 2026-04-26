import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, MenuItem,
  Alert, CircularProgress, Chip, LinearProgress,
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { Court, COURT_COLORS } from '../types';
import { fetchCourts, createIssue } from '../api';

export default function ReportIssuePage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtId, setCourtId] = useState<number | ''>('');
  const [reporterName, setReporterName] = useState('');
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCourts().then(setCourts).catch(() => setError('Failed to load courts.'));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setImageName(file.name);
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setImageBase64(result);
      setImagePreview(result);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    setImageName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!courtId) { setError('Please select a court'); return; }
    if (!reporterName.trim()) { setError('Please enter your name'); return; }
    if (!description.trim() || description.trim().length < 10) {
      setError('Please describe the issue (at least 10 characters)'); return;
    }
    setError('');
    setLoading(true);
    try {
      await createIssue({ courtId: +courtId, description: description.trim(), imageBase64, reporterName: reporterName.trim() });
      setSuccess(true);
      setCourtId('');
      setReporterName('');
      setDescription('');
      handleRemoveImage();
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCourt = courts.find(c => c.id === courtId);
  const colors = selectedCourt ? COURT_COLORS[selectedCourt.colorKey] : null;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <ReportProblemIcon sx={{ fontSize: 36, color: '#F57C00' }} />
        <Typography variant="h4" fontWeight={700} color="primary">Report a Court Issue</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Help us keep the courts in great condition. Report any issues you encounter.
      </Typography>

      {success && (
        <Alert
          icon={<CheckCircleIcon />} severity="success" sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setSuccess(false)}
        >
          Your issue has been reported successfully. Our team will review it shortly.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Court selector */}
          <TextField
            select label="Select Court" value={courtId}
            onChange={e => setCourtId(+e.target.value as number)}
            fullWidth required
          >
            {courts.map(c => (
              <MenuItem key={c.id} value={c.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COURT_COLORS[c.colorKey].primary }} />
                  {c.name} — {c.fullName}
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {selectedCourt && (
            <Box sx={{ p: 1.5, bgcolor: colors?.light, borderRadius: 2, border: `1px solid ${colors?.primary}30` }}>
              <Typography variant="body2" sx={{ color: colors?.primary, fontWeight: 600 }}>
                📍 {selectedCourt.location.address}
              </Typography>
            </Box>
          )}

          <TextField
            label="Your Name" value={reporterName}
            onChange={e => setReporterName(e.target.value)}
            placeholder="John Smith" fullWidth required
          />

          <TextField
            label="Describe the Issue" value={description}
            onChange={e => setDescription(e.target.value)}
            multiline rows={4} fullWidth required
            placeholder="Please describe the problem in detail — location on court, severity, when you noticed it..."
            helperText={`${description.length} characters (min 10)`}
          />

          {/* Image upload */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Photo Evidence (optional)
            </Typography>
            <input
              ref={fileRef} type="file" accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }} id="issue-image-upload"
            />
            {!imagePreview ? (
              <label htmlFor="issue-image-upload">
                <Box
                  sx={{
                    border: '2px dashed #BDBDBD', borderRadius: 2, p: 4,
                    textAlign: 'center', cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#1B5E20', bgcolor: '#F1F8E9' },
                  }}
                >
                  {uploading ? (
                    <LinearProgress sx={{ mt: 1 }} />
                  ) : (
                    <>
                      <CloudUploadIcon sx={{ fontSize: 40, color: '#9E9E9E', mb: 1 }} />
                      <Typography color="text.secondary">Click to upload image</Typography>
                      <Typography variant="caption" color="text.secondary">PNG, JPG, GIF up to 5MB</Typography>
                    </>
                  )}
                </Box>
              </label>
            ) : (
              <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Issue preview"
                  sx={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 2, display: 'block' }}
                />
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Chip label={imageName} size="small" icon={<CloudUploadIcon />} />
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={handleRemoveImage}>
                    Remove
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          <Button
            variant="contained" size="large" onClick={handleSubmit}
            disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ReportProblemIcon />}
            sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#BF360C' } }}
          >
            {loading ? 'Submitting...' : 'Submit Issue Report'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
