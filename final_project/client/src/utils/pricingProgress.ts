import { PRICING_STEPS } from '../constants'
import type { PricingKey } from '../types'
import { loadUserData } from '../storage'

const ALL_KEYS: PricingKey[] = PRICING_STEPS.map((s) => s.key)

export function isPricingComplete(username: string): boolean {
  const { pricing } = loadUserData(username)
  return ALL_KEYS.every((k) => typeof pricing[k] === 'number' && !Number.isNaN(pricing[k]))
}

export function firstIncompleteStep(username: string): number {
  const { pricing } = loadUserData(username)
  for (const step of PRICING_STEPS) {
    const v = pricing[step.key]
    if (typeof v !== 'number' || Number.isNaN(v)) return step.step
  }
  return PRICING_STEPS.length + 1
}
