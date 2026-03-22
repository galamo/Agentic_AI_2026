import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import ExpensesPage from "./pages/ExpensesPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">Lab 17 — Expenses</div>
        <nav className="nav-links">
          <NavLink to="/expenses" className={({ isActive }) => (isActive ? "active" : "")}>
            Expenses &amp; stats
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => (isActive ? "active" : "")}>
            Upload receipt
          </NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/expenses" replace />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </div>
  );
}
