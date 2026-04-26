import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Card, CardContent,
  CircularProgress, Alert, Chip, LinearProgress,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import NavigationIcon from '@mui/icons-material/Navigation';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Court, COURT_COLORS, COURT_CHART_COLORS } from '../types';
import { fetchCourts } from '../api';
import TennisCourtSVG from '../components/TennisCourtSVG';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function walkTime(km: number): string {
  const mins = Math.round((km / 5) * 60);
  if (mins < 60) return `${mins} min walk`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m walk`;
}

function distanceBar({ km, max }: { km: number; max: number }) {
  const pct = Math.max(10, Math.min(100, (1 - km / max) * 90 + 10));
  return pct;
}

interface CourtWithDistance extends Court {
  distanceKm: number;
}

// SVG mini-map showing court positions relative to user
function MiniMap({ courts, userLat, userLng }: { courts: CourtWithDistance[]; userLat: number; userLng: number }) {
  const W = 340, H = 260, pad = 30;
  const allLats = [userLat, ...courts.map(c => c.location.lat)];
  const allLngs = [userLng, ...courts.map(c => c.location.lng)];
  const minLat = Math.min(...allLats), maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs), maxLng = Math.max(...allLngs);
  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  const toX = (lng: number) => pad + ((lng - minLng) / lngRange) * (W - pad * 2);
  const toY = (lat: number) => H - pad - ((lat - minLat) / latRange) * (H - pad * 2);

  const ux = toX(userLng), uy = toY(userLat);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <rect width={W} height={H} fill="#E8F5E9" rx={12} />
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(t => (
        <React.Fragment key={t}>
          <line x1={pad} y1={pad + (H - pad * 2) * t} x2={W - pad} y2={pad + (H - pad * 2) * t}
            stroke="#C8E6C9" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={pad + (W - pad * 2) * t} y1={pad} x2={pad + (W - pad * 2) * t} y2={H - pad}
            stroke="#C8E6C9" strokeWidth={1} strokeDasharray="4 4" />
        </React.Fragment>
      ))}

      {/* Lines from user to courts */}
      {courts.map((c, i) => (
        <line key={c.id}
          x1={ux} y1={uy} x2={toX(c.location.lng)} y2={toY(c.location.lat)}
          stroke={COURT_CHART_COLORS[i]} strokeWidth={1.5} strokeDasharray="5 3" opacity={0.5}
        />
      ))}

      {/* Court circles */}
      {courts.map((c, i) => {
        const cx = toX(c.location.lng), cy = toY(c.location.lat);
        return (
          <g key={c.id}>
            <circle cx={cx} cy={cy} r={16} fill={COURT_CHART_COLORS[i]} opacity={0.15} />
            <circle cx={cx} cy={cy} r={10} fill={COURT_CHART_COLORS[i]} />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize={9} fontWeight={700}>{c.id}</text>
            <text x={cx} y={cy + 22} textAnchor="middle" fill={COURT_CHART_COLORS[i]} fontSize={9} fontWeight={600}>
              {c.distanceKm.toFixed(1)}km
            </text>
          </g>
        );
      })}

      {/* User location */}
      <circle cx={ux} cy={uy} r={18} fill="#1B5E20" opacity={0.15} />
      <circle cx={ux} cy={uy} r={10} fill="#1B5E20" />
      <text x={ux} y={uy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={8}>YOU</text>

      {/* Legend */}
      <rect x={8} y={8} width={80} height={16} rx={3} fill="rgba(255,255,255,0.8)" />
      <circle cx={18} cy={16} r={5} fill="#1B5E20" />
      <text x={27} y={20} fontSize={9} fill="#333">Your Location</text>
    </svg>
  );
}

export default function FindCourtPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [sorted, setSorted] = useState<CourtWithDistance[]>([]);

  useEffect(() => {
    fetchCourts()
      .then(setCourts)
      .catch(() => setError('Failed to load courts.'))
      .finally(() => setLoading(false));
  }, []);

  const findLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        const withDist: CourtWithDistance[] = courts.map(c => ({
          ...c,
          distanceKm: haversineKm(lat, lng, c.location.lat, c.location.lng),
        })).sort((a, b) => a.distanceKm - b.distanceKm);
        setSorted(withDist);
        setLocating(false);
      },
      () => {
        // Fallback: use a demo location near the courts
        const demoLat = 32.083;
        const demoLng = 34.778;
        setUserPos({ lat: demoLat, lng: demoLng });
        const withDist: CourtWithDistance[] = courts.map(c => ({
          ...c,
          distanceKm: haversineKm(demoLat, demoLng, c.location.lat, c.location.lng),
        })).sort((a, b) => a.distanceKm - b.distanceKm);
        setSorted(withDist);
        setLocating(false);
        setError('Could not get your exact location — showing results from a nearby demo position.');
      },
      { timeout: 8000 }
    );
  };

  const maxDist = sorted.length ? Math.max(...sorted.map(c => c.distanceKm)) : 1;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <LocationOnIcon sx={{ fontSize: 36, color: '#1B5E20' }} />
        <Typography variant="h4" fontWeight={700} color="primary">Find Closest Court</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={4}>
        We'll use your location to find the nearest available tennis court.
      </Typography>

      {error && <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {!userPos && (
        <Paper
          sx={{
            p: 5, textAlign: 'center', borderRadius: 3,
            background: 'linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)',
            border: '2px dashed #A5D6A7',
          }}
        >
          <LocationOnIcon sx={{ fontSize: 72, color: '#4CAF50', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
            Find Your Nearest Court
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3} maxWidth={400} mx="auto">
            Click the button below to share your location. We'll instantly show you the closest courts sorted by distance.
          </Typography>
          <Button
            variant="contained" size="large"
            onClick={findLocation}
            disabled={locating}
            startIcon={locating ? <CircularProgress size={20} color="inherit" /> : <GpsFixedIcon />}
            sx={{ px: 4 }}
          >
            {locating ? 'Locating...' : 'Use My Location'}
          </Button>
        </Paper>
      )}

      {locating && <LinearProgress sx={{ mt: 2 }} />}

      {userPos && sorted.length > 0 && (
        <Grid container spacing={3}>
          {/* Mini map */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="primary">
                📍 Court Map
              </Typography>
              <MiniMap courts={sorted} userLat={userPos.lat} userLng={userPos.lng} />
              <Button
                fullWidth variant="outlined" size="small" sx={{ mt: 1.5 }}
                onClick={findLocation}
                startIcon={<GpsFixedIcon />}
              >
                Refresh Location
              </Button>
            </Paper>
          </Grid>

          {/* Court list */}
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sorted.map((court, idx) => {
                const colors = COURT_COLORS[court.colorKey];
                const isClosest = idx === 0;
                return (
                  <Card
                    key={court.id}
                    sx={{
                      borderRadius: 3,
                      border: isClosest ? `2px solid ${colors.primary}` : `1px solid ${colors.light}`,
                      position: 'relative', overflow: 'visible',
                    }}
                  >
                    {isClosest && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Closest!"
                        color="success"
                        size="small"
                        sx={{
                          position: 'absolute', top: -12, left: 16,
                          fontWeight: 700,
                        }}
                      />
                    )}
                    <CardContent sx={{ pt: isClosest ? 2.5 : 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item>
                          <TennisCourtSVG colorKey={court.colorKey} width={100} height={64} />
                        </Grid>
                        <Grid item xs>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="h6" fontWeight={700}>{court.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{court.fullName}</Typography>
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                                <LocationOnIcon sx={{ fontSize: 14 }} />
                                {court.location.address}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h5" fontWeight={700} color={colors.primary}>
                                {court.distanceKm.toFixed(1)} km
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: 'text.secondary', justifyContent: 'flex-end' }}>
                                <DirectionsWalkIcon sx={{ fontSize: 14 }} />
                                {walkTime(court.distanceKm)}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={distanceBar({ km: court.distanceKm, max: maxDist })}
                              sx={{
                                height: 6, borderRadius: 3,
                                bgcolor: colors.light,
                                '& .MuiLinearProgress-bar': { bgcolor: colors.primary, borderRadius: 3 },
                              }}
                            />
                          </Box>
                        </Grid>
                        <Grid item>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Chip
                              label={`#${idx + 1}`}
                              sx={{ bgcolor: colors.light, color: colors.primary, fontWeight: 800, fontSize: '1rem' }}
                            />
                            <Button
                              variant="contained" size="small"
                              href={`https://www.google.com/maps/dir/?api=1&destination=${court.location.lat},${court.location.lng}`}
                              target="_blank"
                              startIcon={<NavigationIcon />}
                              sx={{
                                background: `linear-gradient(135deg, ${colors.surface} 0%, ${colors.primary} 100%)`,
                                fontSize: '0.75rem',
                              }}
                            >
                              Directions
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
