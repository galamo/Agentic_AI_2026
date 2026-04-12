import { PRICING_STEPS } from './constants'
import type { PricingKey, UserStoredData } from './types'

const STORAGE_PREFIX = 'contractor_pricing_app'

function keyForUser(username: string): string {
  return `${STORAGE_PREFIX}:${username.toLowerCase()}`
}

export function loadUserData(username: string): UserStoredData {
  try {
    const raw = localStorage.getItem(keyForUser(username))
    if (!raw) return { pricing: {} }
    const parsed = JSON.parse(raw) as UserStoredData
    return {
      pricing: parsed.pricing ?? {},
      quoteFile: parsed.quoteFile,
    }
  } catch {
    return { pricing: {} }
  }
}

export function saveUserData(username: string, data: UserStoredData): void {
  localStorage.setItem(keyForUser(username), JSON.stringify(data))
}

export function updatePricing(
  username: string,
  key: PricingKey,
  value: number,
): void {
  const prev = loadUserData(username)
  saveUserData(username, {
    ...prev,
    pricing: { ...prev.pricing, [key]: value },
  })
}

/** Multiplies every saved rate by `factor` (e.g. 1.15 for +15%). */
export function multiplyAllRates(username: string, factor: number): void {
  const prev = loadUserData(username)
  const pricing = { ...prev.pricing }
  for (const { key } of PRICING_STEPS) {
    const v = pricing[key]
    if (typeof v === 'number') {
      pricing[key] = Math.round(v * factor * 100) / 100
    }
  }
  saveUserData(username, { ...prev, pricing })
}

export function clearUserData(username: string): void {
  localStorage.removeItem(keyForUser(username))
}

export function setQuoteFileMeta(
  username: string,
  meta: NonNullable<UserStoredData['quoteFile']>,
): void {
  const prev = loadUserData(username)
  saveUserData(username, { ...prev, quoteFile: meta })
}
