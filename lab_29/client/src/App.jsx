import { useEffect, useState } from 'react'

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'created_at', label: 'Created At' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function App() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/users')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { setUsers(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Users</h1>
        {!loading && !error && (
          <span style={styles.badge}>{users.length} records</span>
        )}
      </header>

      <main style={styles.main}>
        {loading && <p style={styles.info}>Loading…</p>}
        {error && <p style={styles.error}>Error: {error}</p>}
        {!loading && !error && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key} style={styles.th}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={user.id} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    {COLUMNS.map(col => (
                      <td key={col.key} style={styles.td}>
                        {col.key === 'created_at' ? formatDate(user[col.key]) : user[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    background: '#1a1a2e',
    color: '#fff',
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' },
  badge: {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 13,
    color: '#a8b4c8',
  },
  main: { flex: 1, padding: 32 },
  info: { color: '#666', textAlign: 'center', marginTop: 60 },
  error: { color: '#c0392b', textAlign: 'center', marginTop: 60 },
  tableWrapper: {
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#1a1a2e',
    color: '#a8b4c8',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    padding: '14px 18px',
    textAlign: 'left',
  },
  td: { padding: '13px 18px', fontSize: 14, borderBottom: '1px solid #f0f0f0' },
  rowEven: { background: '#fff' },
  rowOdd: { background: '#fafafa' },
}
