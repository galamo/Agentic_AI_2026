import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clearUserData } from '../storage'

export function AppLayout() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()

  function onReset() {
    if (!username) return
    const ok = window.confirm(
      'Reset all saved pricing and quote file metadata for this username on this device?',
    )
    if (!ok) return
    clearUserData(username)
    navigate('/pricing/1', { replace: true })
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Contractor pricing</div>
        {username ? (
          <div className="topbar-actions">
            <span className="muted small">Signed in as {username}</span>
            <button type="button" className="btn btn-ghost" onClick={onReset}>
              Reset my data
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Log out
            </button>
          </div>
        ) : null}
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
