import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton,
  Drawer, List, ListItemButton, ListItemIcon, ListItemText, useMediaQuery, useTheme,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import SportsIcon from '@mui/icons-material/Sports';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import BugReportIcon from '@mui/icons-material/BugReport';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MenuIcon from '@mui/icons-material/Menu';

const navItems = [
  { label: 'Courts', path: '/courts', icon: <SportsIcon /> },
  { label: 'Bookings', path: '/bookings', icon: <CalendarMonthIcon /> },
  { label: 'Statistics', path: '/statistics', icon: <BarChartIcon /> },
  { label: 'Daily Report', path: '/daily-report', icon: <PieChartIcon /> },
  { label: 'Report Issue', path: '/report-issue', icon: <ReportProblemIcon /> },
  { label: 'Issues', path: '/issues', icon: <BugReportIcon /> },
  { label: 'Find Court', path: '/find-court', icon: <LocationOnIcon /> },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 40%, #F9A825, #E65100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <SportsIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{ fontFamily: '"Playfair Display", serif', letterSpacing: 0.5, whiteSpace: 'nowrap' }}
            >
              Tennis Courts
            </Typography>
          </Box>

          {isMobile ? (
            <>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                <MenuIcon />
              </IconButton>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {navItems.map(item => (
                <Button
                  key={item.path}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{
                    opacity: location.pathname === item.path ? 1 : 0.75,
                    borderBottom: location.pathname === item.path ? '2px solid #F9A825' : '2px solid transparent',
                    borderRadius: '4px 4px 0 0',
                    px: 1.5,
                    py: 0.75,
                    '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250, pt: 2 }}>
          <Typography variant="h6" sx={{ px: 2, pb: 1, fontFamily: '"Playfair Display", serif', color: '#1B5E20' }}>
            Menu
          </Typography>
          <List>
            {navItems.map(item => (
              <ListItemButton
                key={item.path}
                selected={location.pathname === item.path}
                onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                sx={{ '&.Mui-selected': { bgcolor: '#E8F5E9', color: '#1B5E20' } }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
