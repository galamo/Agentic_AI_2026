# Tennis Court Booking App

Full-stack tennis court booking system with React + TypeScript frontend and Node.js + TypeScript backend.

## Quick Start

### 1. Start the Server
```bash
cd server
npm install
npm run dev
# Runs on http://localhost:3001
```

### 2. Start the Client
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5173
```

## Features

- **4 Courts** — Blue Hard, Clay, Grass, Teal Hard
- **Court Booking** — 1-hour minimum, 8:00–22:00 daily, conflict detection
- **Booking Confirmation** — Unique confirmation code after booking
- **All Bookings** — Filterable table by court, cancel upcoming bookings
- **Statistics** — Bar chart (bookings/day) + Line chart (hours used/day) over 14 days
- **Daily Report** — Pie charts for bookings and hours per court on any date
- **Report Issue** — Select court, upload photo, describe problem
- **Issue Reports** — View, filter, and update issue status
- **Find Closest Court** — Geolocation-based distance sorting with mini-map

## Tech Stack

**Client:** React 18, TypeScript, Material UI v5, Recharts, React Router v6, Vite  
**Server:** Node.js, TypeScript, Express, UUID  
**Storage:** JSON files (bookings.json, issues.json)
