export type PricingKey =
  | 'wallDemolitionPerM2'
  | 'wallBuildPerM2'
  | 'gypsumWallPerM2'
  | 'kitchenFullDemolition'
  | 'wasteRemoval'

export interface UserStoredData {
  pricing: Partial<Record<PricingKey, number>>
  quoteFile?: {
    name: string
    type: string
    size: number
    submittedAt: string
  }
}

export interface PricingStepDef {
  step: number
  key: PricingKey
  title: string
  description: string
  unitHint: string
}
