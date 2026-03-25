import './App.css'

import { useEffect, useMemo, useState } from 'react'

type Booking = {
  requestId: string
  room: number
  startIso: string
  endIso: string
  description: string
  userName: string
  createdAtIso: string
}

const STORAGE_KEY = 'lab_21_room_bookings_v1'
const ROOM_MIN = 1
const ROOM_MAX = 10
const ONE_HOUR_MS = 60 * 60 * 1000

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toDateTimeLocalValue(d: Date) {
  // datetime-local expects: YYYY-MM-DDTHH:mm (local time, no timezone suffix)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}`
}

function defaultDateTimeLocalValue() {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(0) // keep it on the hour (aligns with "one hour only")
  d.setMilliseconds(0)
  return toDateTimeLocalValue(d)
}

function parseDateTimeLocal(value: string): Date | null {
  // Expected format: YYYY-MM-DDTHH:mm
  const m = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  )
  if (!m) return null
  const year = Number(m[1])
  const monthIndex = Number(m[2]) - 1
  const day = Number(m[3])
  const hour = Number(m[4])
  const minute = Number(m[5])
  const d = new Date(year, monthIndex, day, hour, minute, 0, 0)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  // [aStart, aEnd) overlaps [bStart, bEnd)
  return aStart < bEnd && aEnd > bStart
}

function newRequestId() {
  // Browser API is preferred, but keep a fallback for older environments.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `req_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function loadBookings(): Booking[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is Booking => {
      if (!x || typeof x !== 'object') return false
      if (typeof x.requestId !== 'string') return false
      if (typeof x.room !== 'number') return false
      if (typeof x.startIso !== 'string') return false
      if (typeof x.endIso !== 'string') return false
      if (typeof x.description !== 'string') return false
      if (typeof x.userName !== 'string') return false
      if (typeof x.createdAtIso !== 'string') return false
      return true
    })
  } catch {
    return []
  }
}

function saveBookings(bookings: Booking[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
}

export default function App() {
  const [dateTime, setDateTime] = useState<string>(() => defaultDateTimeLocalValue())
  const [description, setDescription] = useState('')
  const [userName, setUserName] = useState('')
  const [room, setRoom] = useState<number>(1)

  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings())

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  // "Real time": update the UI whenever another tab changes localStorage.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setBookings(loadBookings())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const sortedBookings = useMemo(() => {
    return [...bookings].sort(
      (a, b) => new Date(b.startIso).getTime() - new Date(a.startIso).getTime(),
    )
  }, [bookings])

  function onBook(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const start = parseDateTimeLocal(dateTime)
    if (!start) {
      setMessage({ type: 'error', text: 'Please provide a valid date and time.' })
      return
    }
    if (start.getMinutes() !== 0) {
      setMessage({ type: 'error', text: 'Please select a start time on the hour (minutes: 00).' })
      return
    }
    const end = new Date(start.getTime() + ONE_HOUR_MS)

    const trimmedUser = userName.trim()
    const trimmedDesc = description.trim()
    if (!trimmedUser) {
      setMessage({ type: 'error', text: 'Please enter a user name.' })
      return
    }
    if (!trimmedDesc) {
      setMessage({ type: 'error', text: 'Please enter a description.' })
      return
    }
    if (!Number.isInteger(room) || room < ROOM_MIN || room > ROOM_MAX) {
      setMessage({ type: 'error', text: `Room must be between ${ROOM_MIN} and ${ROOM_MAX}.` })
      return
    }

    // Validate: no overlap in the selected room for that one-hour window.
    const conflict = bookings.find((b) => {
      if (b.room !== room) return false
      const bStart = new Date(b.startIso)
      const bEnd = new Date(b.endIso)
      return rangesOverlap(start, end, bStart, bEnd)
    })

    if (conflict) {
      setMessage({
        type: 'error',
        text: `Booking failed: Room ${room} is already booked for ${formatDateTime(conflict.startIso)} - ${formatDateTime(conflict.endIso)} by ${conflict.userName}.`,
      })
      return
    }

    const requestId = newRequestId()

    const nextBooking: Booking = {
      requestId,
      room,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      description: trimmedDesc,
      userName: trimmedUser,
      createdAtIso: new Date().toISOString(),
    }

    const nextBookings = [nextBooking, ...bookings]
    saveBookings(nextBookings)
    setBookings(nextBookings)

    setMessage({
      type: 'success',
      text: `Booked successfully. Request id: ${requestId}`,
    })

    // Keep `dateTime` and `room` for quick repeat bookings; reset description/user only.
    setDescription('')
    setUserName('')
  }

  return (
    <div className="booking-page">
      <header className="booking-header">
        <h1>Room Booking</h1>
        <p className="subtle">One booking per room per one-hour window (stored in your localStorage).</p>
      </header>

      <div className="booking-layout">
        <form className="booking-form" onSubmit={onBook}>
          <h2>Book a room</h2>

          <label>
            Date and time (1 hour)
            <input
              type="datetime-local"
              step={3600}
              value={dateTime}
              onChange={(ev) => setDateTime(ev.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              rows={4}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              required
              placeholder="What is the meeting about?"
            />
          </label>

          <label>
            User name
            <input
              type="text"
              value={userName}
              onChange={(ev) => setUserName(ev.target.value)}
              required
              placeholder="e.g. Alice"
            />
          </label>

          <label>
            Room (1-10)
            <input
              type="number"
              min={ROOM_MIN}
              max={ROOM_MAX}
              value={room}
              onChange={(ev) => setRoom(Number(ev.target.value))}
              required
            />
          </label>

          <button type="submit">Book</button>

          {message && (
            <div className={`status status--${message.type}`} role="status" aria-live="polite">
              {message.text}
            </div>
          )}
        </form>

        <section className="booking-table-wrap">
          <h2>Bookings</h2>

          {sortedBookings.length === 0 ? (
            <div className="empty">No bookings yet.</div>
          ) : (
            <table className="booking-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Room</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>User</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {sortedBookings.map((b) => (
                  <tr key={b.requestId}>
                    <td className="mono">{b.requestId}</td>
                    <td>{b.room}</td>
                    <td>{formatDateTime(b.startIso)}</td>
                    <td>{formatDateTime(b.endIso)}</td>
                    <td>{b.userName}</td>
                    <td className="desc">{b.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
