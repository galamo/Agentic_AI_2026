import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import ExpensesPage from "./pages/ExpensesPage";
import UploadPage from "./pages/UploadPage";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">Lab 17 — Expenses</div>
        <nav className="nav-links">
          <NavLink to="/expenses" className={({ isActive }) => (isActive ? "active" : "")}>
            Expenses &amp; stats
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>
            Reports &amp; SQL chat
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => (isActive ? "active" : "")}>
            Upload receipt
          </NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/expenses" replace />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </div>
  );
}
