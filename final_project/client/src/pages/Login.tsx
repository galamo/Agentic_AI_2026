import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DEFAULT_PASSWORD, DEFAULT_USERNAME } from '../constants'
import { useAuth } from '../context/AuthContext'
import { firstIncompleteStep, isPricingComplete } from '../utils/pricingProgress'

export function Login() {
  const { username, login } = useAuth()
  const navigate = useNavigate()
  const [user, setUser] = useState(DEFAULT_USERNAME)
  const [password, setPassword] = useState(DEFAULT_PASSWORD)
  const [error, setError] = useState<string | null>(null)

  if (username) {
    if (isPricingComplete(username)) return <Navigate to="/quote" replace />
    return (
      <Navigate to={`/pricing/${firstIncompleteStep(username)}`} replace />
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const ok = login(user, password)
    if (!ok) {
      setError('Invalid credentials. Use the suggested default account or any username with the default password.')
      return
    }
    const u = user.trim().toLowerCase()
    if (isPricingComplete(u)) navigate('/quote', { replace: true })
    else navigate(`/pricing/${firstIncompleteStep(u)}`, { replace: true })
  }

  return (
    <div className="page page--narrow">
      <h1>Sign in</h1>
      <p className="lede">
        Enter your username and password. Pricing you enter is saved per username on this device.
      </p>
      <p className="hint">
        Default account: username <strong>{DEFAULT_USERNAME}</strong>, password{' '}
        <strong>{DEFAULT_PASSWORD}</strong>. You may use any username with password{' '}
        <strong>{DEFAULT_PASSWORD}</strong> to keep separate price lists.
      </p>
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Username</span>
          <input
            autoComplete="username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" className="btn btn-primary">
          Sign in
        </button>
      </form>
    </div>
  )
}
