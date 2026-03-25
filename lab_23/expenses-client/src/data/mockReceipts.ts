import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

/** Expense receipt row (domain entity for this lab). */
export type Receipt = {
  id: string
  amount: number
  /** ISO calendar date (YYYY-MM-DD). */
  date: string
  type: string
  description: string
}

/** Mock receipts for 2026 — varied months, types, and amounts. */
export const mockReceipts: Receipt[] = [
  {
    id: 'r01',
    amount: 47.82,
    date: '2026-01-08',
    type: 'Food',
    description: 'Team lunch — downtown bistro',
  },
  {
    id: 'r02',
    amount: 312.5,
    date: '2026-01-22',
    type: 'Travel',
    description: 'Train tickets — client workshop',
  },
  {
    id: 'r03',
    amount: 19.99,
    date: '2026-02-03',
    type: 'Office',
    description: 'Printer paper restock',
  },
  {
    id: 'r04',
    amount: 1280.0,
    date: '2026-02-17',
    type: 'Software',
    description: 'Annual IDE subscription',
  },
  {
    id: 'r05',
    amount: 64.0,
    date: '2026-03-02',
    type: 'Healthcare',
    description: 'Pharmacy — quarterly refill',
  },
  {
    id: 'r06',
    amount: 89.45,
    date: '2026-03-19',
    type: 'Food',
    description: 'Catering for sprint review',
  },
  {
    id: 'r07',
    amount: 445.0,
    date: '2026-04-11',
    type: 'Travel',
    description: 'Hotel — two nights conference',
  },
  {
    id: 'r08',
    amount: 12.5,
    date: '2026-05-05',
    type: 'Entertainment',
    description: 'Team movie night snacks',
  },
  {
    id: 'r09',
    amount: 275.33,
    date: '2026-06-28',
    type: 'Office',
    description: 'Ergonomic keyboard',
  },
  {
    id: 'r10',
    amount: 58.2,
    date: '2026-07-14',
    type: 'Food',
    description: 'Airport meal — business trip',
  },
  {
    id: 'r11',
    amount: 990.0,
    date: '2026-09-01',
    type: 'Software',
    description: 'Cloud GPU credits',
  },
  {
    id: 'r12',
    amount: 156.75,
    date: '2026-11-30',
    type: 'Travel',
    description: 'Ride share — year-end offsite',
  },
]

export function filterReceipts(
  receipts: Receipt[],
  opts: {
    date: Dayjs | null
    amountText: string
    descriptionText: string
  },
): Receipt[] {
  const amountQ = opts.amountText.trim()
  const descQ = opts.descriptionText.trim().toLowerCase()

  return receipts.filter((r) => {
    if (opts.date) {
      const d = dayjs(r.date)
      if (!d.isValid()) return false
      if (!d.isSame(opts.date, 'day')) return false
    }
    if (amountQ) {
      const asStr = String(r.amount)
      const asNum = Number(amountQ.replace(',', '.'))
      const matchesSubstring = asStr.includes(amountQ)
      const matchesExact =
        !Number.isNaN(asNum) && Math.abs(r.amount - asNum) < 1e-9
      if (!matchesSubstring && !matchesExact) return false
    }
    if (descQ && !r.description.toLowerCase().includes(descQ)) return false
    return true
  })
}

export function aggregateAmountByType(receipts: Receipt[]) {
  const map = new Map<string, number>()
  for (const r of receipts) {
    map.set(r.type, (map.get(r.type) ?? 0) + r.amount)
  }
  return [...map.entries()].map(([label, value]) => ({ label, value }))
}

export function aggregateAmountByMonth(receipts: Receipt[]) {
  const map = new Map<string, { sortKey: string; label: string; value: number }>()
  for (const r of receipts) {
    const d = dayjs(r.date)
    if (!d.isValid()) continue
    const sortKey = d.format('YYYY-MM')
    const label = d.format('MMM YYYY')
    const cur = map.get(sortKey)
    if (cur) cur.value += r.amount
    else map.set(sortKey, { sortKey, label, value: r.amount })
  }
  return [...map.values()]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ label, value }) => ({ label, value }))
}
