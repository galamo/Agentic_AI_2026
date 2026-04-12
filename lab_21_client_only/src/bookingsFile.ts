/** Read/write bookings as JSON via File System Access API and persist via IDB + fetch endpoints. */

import axios from 'axios'

export type Booking = {
  requestId: string
  room: number
  startIso: string
  endIso: string
  description: string
  userName: string
  createdAtIso: string
}

export type CreateBookingRequest = {
  requestId?: string
  room: number
  startIso: string
  endIso: string
  description: string
  userName: string
}

const IDB_NAME = 'lab_21_bookings_file_v1'
const IDB_STORE = 'kv'
const HANDLE_KEY = 'bookingsJsonHandle'

export function supportsLocalFileBookings(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

export function coerceBookingsArray(data: unknown): Booking[] {
  if (!Array.isArray(data)) return []
  return data.filter((x): x is Booking => {
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
}

export function mergeBookingsByRequestId(base: Booking[], overlay: Booking[]): Booking[] {
  const map = new Map<string, Booking>()
  for (const b of base) map.set(b.requestId, b)
  for (const b of overlay) map.set(b.requestId, b)
  return Array.from(map.values())
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
  })
}

export async function persistFileHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openIdb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('indexedDB put failed'))
    tx.onabort = () => reject(tx.error ?? new Error('indexedDB put aborted'))
  })
}

export async function loadPersistedFileHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY)
    req.onsuccess = () => {
      const v = req.result
      resolve(v instanceof FileSystemFileHandle ? v : null)
    }
    req.onerror = () => reject(req.error ?? new Error('indexedDB get failed'))
  })
}

export async function clearPersistedFileHandle(): Promise<void> {
  const db = await openIdb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('indexedDB delete failed'))
    tx.onabort = () => reject(tx.error ?? new Error('indexedDB delete aborted'))
  })
}

export async function requestFileAccess(handle: FileSystemFileHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as const }
  let perm = await handle.queryPermission(opts)
  if (perm === 'granted') return true
  perm = await handle.requestPermission(opts)
  return perm === 'granted'
}

export async function readBookingsFromFileBlob(file: File): Promise<Booking[]> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return []
  }
  return coerceBookingsArray(parsed)
}

export async function readBookingsFromHandle(handle: FileSystemFileHandle): Promise<Booking[]> {
  const file = await handle.getFile()
  return readBookingsFromFileBlob(file)
}

export async function writeBookingsToHandle(
  handle: FileSystemFileHandle,
  bookings: Booking[],
): Promise<void> {
  const json = JSON.stringify(bookings, null, 2)
  const writable = await handle.createWritable()
  await writable.write(json)
  await writable.close()
}

export async function pickOpenBookingsFile(): Promise<FileSystemFileHandle | null> {
  try {
    const handles = await window.showOpenFilePicker({
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    })
    return handles[0] ?? null
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

export async function pickSaveNewBookingsFile(): Promise<FileSystemFileHandle | null> {
  try {
    return await window.showSaveFilePicker({
      suggestedName: 'lab_21_bookings.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

export async function createNewBookingsFile(): Promise<FileSystemFileHandle | null> {
  const handle = await pickSaveNewBookingsFile()
  if (!handle) return null
  await writeBookingsToHandle(handle, [])
  return handle
}

export async function fetchBundledBookingsJson(url = '/lab_21_bookings.json'): Promise<Booking[]> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return []
    const parsed = (await r.json()) as unknown
    return coerceBookingsArray(parsed)
  } catch {
    return []
  }
}

export async function fetchApiBookingsJson(url = '/api/bookings'): Promise<Booking[]> {
  try {
    const { data } = await axios.get<unknown>(url, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    return coerceBookingsArray(data)
  } catch {
    return []
  }
}

function coerceBookingObject(data: unknown): Booking | null {
  if (!data || typeof data !== 'object') return null
  const x = data as Record<string, unknown>
  if (typeof x.requestId !== 'string') return null
  if (typeof x.room !== 'number') return null
  if (typeof x.startIso !== 'string') return null
  if (typeof x.endIso !== 'string') return null
  if (typeof x.description !== 'string') return null
  if (typeof x.userName !== 'string') return null
  if (typeof x.createdAtIso !== 'string') return null
  return x as Booking
}

export async function createBookingViaApi(
  booking: CreateBookingRequest,
  url = '/api/bookings',
): Promise<Booking> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  })

  if (!r.ok) {
    let detail = `Request failed with status ${r.status}.`
    try {
      const parsed = (await r.json()) as unknown
      if (parsed && typeof parsed === 'object' && 'detail' in parsed) {
        const maybe = parsed as { detail?: unknown }
        if (typeof maybe.detail === 'string') {
          detail = maybe.detail
        }
      }
    } catch {
      // ignore parse errors; fall back to status message
    }
    throw new Error(detail)
  }

  const parsed = (await r.json()) as unknown
  const coerced = coerceBookingObject(parsed)
  if (!coerced) throw new Error('API returned invalid booking payload.')
  return coerced
}

const FALLBACK_DOWNLOAD_NAME = 'lab_21_bookings.json'

export function downloadBookingsJson(bookings: Booking[]): void {
  const json = JSON.stringify(bookings, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = FALLBACK_DOWNLOAD_NAME
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
