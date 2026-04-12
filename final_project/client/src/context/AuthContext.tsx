import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_PASSWORD } from '../constants'

type AuthContextValue = {
  username: string | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_KEY = 'contractor_pricing_app_session_user'

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSession(user: string | null) {
  if (user) localStorage.setItem(SESSION_KEY, user)
  else localStorage.removeItem(SESSION_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => readSession())

  const login = useCallback((user: string, password: string) => {
    const u = user.trim().toLowerCase()
    if (!u || u.length > 64) return false
    if (password !== DEFAULT_PASSWORD) return false
    setUsername(u)
    writeSession(u)
    return true
  }, [])

  const logout = useCallback(() => {
    setUsername(null)
    writeSession(null)
  }, [])

  const value = useMemo(
    () => ({ username, login, logout }),
    [username, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
