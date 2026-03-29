import './App.css'

import { useEffect, useMemo, useState } from 'react'
import type { Booking } from './bookingsFile'
import {
  clearPersistedFileHandle,
  createNewBookingsFile,
  createBookingViaApi,
  fetchApiBookingsJson,
  persistFileHandle,
  pickOpenBookingsFile,
  readBookingsFromHandle,
  loadPersistedFileHandle,
  requestFileAccess,
  supportsLocalFileBookings,
  writeBookingsToHandle,
} from './bookingsFile'

const ROOM_MIN = 1
const ROOM_MAX = 10
const ONE_HOUR_MS = 60 * 60 * 1000

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toDateTimeLocalValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}`
}

function defaultDateTimeLocalValue() {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(0)
  d.setMilliseconds(0)
  return toDateTimeLocalValue(d)
}

function parseDateTimeLocal(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
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
  return aStart < bEnd && aEnd > bStart
}

function newRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `req_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export default function App() {
  const [dateTime, setDateTime] = useState<string>(() => defaultDateTimeLocalValue())
  const [description, setDescription] = useState('')
  const [userName, setUserName] = useState('')
  const [room, setRoom] = useState<number>(1)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [persistenceMode, setPersistenceMode] = useState<'disk' | 'api'>('api')
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [fileLabel, setFileLabel] = useState<string | null>(null)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (supportsLocalFileBookings()) {
          const stored = await loadPersistedFileHandle()
          if (!cancelled && stored) {
            const ok = await requestFileAccess(stored)
            if (ok) {
              const list = await readBookingsFromHandle(stored)
              if (!cancelled) {
                setFileHandle(stored)
                setFileLabel(stored.name)
                setPersistenceMode('disk')
                setBookings(list)
                setReady(true)
                return
              }
            }
          }
        }

        const fromApi = await fetchApiBookingsJson()
        if (!cancelled) {
          setPersistenceMode('api')
          setBookings(fromApi)
          setReady(true)
        }
      } catch (e) {
        if (!cancelled) {
          setInitError(e instanceof Error ? e.message : 'Failed to load bookings.')
          setReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sortedBookings = useMemo(() => {
    return [...bookings].sort(
      (a, b) => new Date(b.startIso).getTime() - new Date(a.startIso).getTime(),
    )
  }, [bookings])

  async function connectOpenFile() {
    setMessage(null)
    if (!supportsLocalFileBookings()) {
      setMessage({
        type: 'error',
        text: 'Your browser does not support opening a JSON file for read/write. Use Chrome or Edge, or rely on the API mode.',
      })
      return
    }
    const h = await pickOpenBookingsFile()
    if (!h) return
    if (!(await requestFileAccess(h))) {
      setMessage({
        type: 'error',
        text: 'Read/write permission is required to use this bookings file.',
      })
      return
    }
    let list: Booking[]
    try {
      list = await readBookingsFromHandle(h)
    } catch {
      setMessage({ type: 'error', text: 'Could not parse JSON from this file.' })
      return
    }
    await persistFileHandle(h)
    setFileHandle(h)
    setFileLabel(h.name)
    setPersistenceMode('disk')
    setBookings(list)
  }

  async function connectNewFile() {
    setMessage(null)
    if (!supportsLocalFileBookings()) {
      setMessage({
        type: 'error',
        text: 'Your browser does not support saving a JSON file. Use Chrome or Edge.',
      })
      return
    }
    const h = await createNewBookingsFile()
    if (!h) return
    if (!(await requestFileAccess(h))) {
      setMessage({ type: 'error', text: 'Read/write permission is required.' })
      return
    }
    await persistFileHandle(h)
    setFileHandle(h)
    setFileLabel(h.name)
    setPersistenceMode('disk')
    setBookings([])
  }

  async function reloadFromDisk() {
    setMessage(null)
    if (!fileHandle) return
    if (!(await requestFileAccess(fileHandle))) {
      setMessage({ type: 'error', text: 'Could not obtain permission to read the file.' })
      return
    }
    try {
      const list = await readBookingsFromHandle(fileHandle)
      setBookings(list)
    } catch {
      setMessage({ type: 'error', text: 'Could not read bookings from file.' })
    }
  }

  async function disconnectDiskFile() {
    setMessage(null)
    await clearPersistedFileHandle()
    setFileHandle(null)
    setFileLabel(null)
    const fromApi = await fetchApiBookingsJson()
    setPersistenceMode('api')
    setBookings(fromApi)
  }

  async function persistBookingsList(nextBookings: Booking[], nextBooking: Booking): Promise<Booking> {
    if (persistenceMode === 'disk' && fileHandle) {
      await writeBookingsToHandle(fileHandle, nextBookings)
      return nextBooking
    }
    // API mode: let the server persist into `api/Data.json` and reject overlaps.
    return await createBookingViaApi({
      requestId: nextBooking.requestId,
      room: nextBooking.room,
      startIso: nextBooking.startIso,
      endIso: nextBooking.endIso,
      description: nextBooking.description,
      userName: nextBooking.userName,
    })
  }

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

    void (async () => {
      try {
        const persisted = await persistBookingsList(nextBookings, nextBooking)
        setBookings(persistenceMode === 'api' ? [persisted, ...bookings] : nextBookings)
        setMessage({
          type: 'success',
          text: `Booked successfully. Request id: ${persisted.requestId}`,
        })
        setDescription('')
        setUserName('')
      } catch (err) {
        setMessage({
          type: 'error',
          text: `Could not save bookings: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    })()
  }

  if (!ready) {
    return (
      <div className="booking-page">
        <p className="subtle">Loading bookings…</p>
      </div>
    )
  }

  return (
    <div className="booking-page">
      <header className="booking-header">
        <h1>Room Booking</h1>
        <p className="subtle">
          Bookings are loaded from the API (backed by <code className="mono-inline">api/Data.json</code>)
          and persisted by the API on each successful booking. Use <strong>Open JSON file</strong> to
          read/write a local disk file instead (Chrome/Edge).
        </p>
      </header>

      {initError && (
        <div className="status status--error" role="alert">
          {initError}
        </div>
      )}

      <div className="booking-file-bar">
        {persistenceMode === 'disk' && fileLabel ? (
          <>
            <span className="booking-file-bar__label">
              File: <strong>{fileLabel}</strong>
            </span>
            <button type="button" className="btn-secondary" onClick={() => void reloadFromDisk()}>
              Reload from file
            </button>
            <button type="button" className="btn-secondary" onClick={() => void disconnectDiskFile()}>
              Use API copy instead
            </button>
          </>
        ) : (
          <>
            <span className="booking-file-bar__label">No disk file connected (API mode).</span>
            <button type="button" className="btn-secondary" onClick={() => void connectOpenFile()}>
              Open JSON file…
            </button>
            <button type="button" className="btn-secondary" onClick={() => void connectNewFile()}>
              Create new JSON…
            </button>
          </>
        )}
      </div>

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
