import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './components/Navbar';
import CourtsPage from './pages/CourtsPage';
import BookingsPage from './pages/BookingsPage';
import StatisticsPage from './pages/StatisticsPage';
import DailyReportPage from './pages/DailyReportPage';
import ReportIssuePage from './pages/ReportIssuePage';
import IssueReportsPage from './pages/IssueReportsPage';
import FindCourtPage from './pages/FindCourtPage';

export default function App() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #E8F5E9 0%, #F1F8E9 40%, #FFFFFF 100%)',
      }}
    >
      <Navbar />
      <Box sx={{ pt: 2, pb: 6, px: { xs: 1, sm: 2, md: 3 } }}>
        <Routes>
          <Route path="/" element={<Navigate to="/courts" replace />} />
          <Route path="/courts" element={<CourtsPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/daily-report" element={<DailyReportPage />} />
          <Route path="/report-issue" element={<ReportIssuePage />} />
          <Route path="/issues" element={<IssueReportsPage />} />
          <Route path="/find-court" element={<FindCourtPage />} />
        </Routes>
      </Box>
    </Box>
  );
}
