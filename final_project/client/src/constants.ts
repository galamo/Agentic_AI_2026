import type { PricingStepDef } from './types'

/** Demo account shown on the login screen */
export const DEFAULT_USERNAME = 'demo'
export const DEFAULT_PASSWORD = 'demo'

export const PRICING_STEPS: PricingStepDef[] = [
  {
    step: 1,
    key: 'wallDemolitionPerM2',
    title: 'Wall demolition',
    description:
      'How much do you charge per square meter for demolishing a structural or partition wall (labor and typical disposal, as you define)?',
    unitHint: 'Price per m²',
  },
  {
    step: 2,
    key: 'wallBuildPerM2',
    title: 'Wall construction',
    description:
      'How much do you charge per square meter for building a standard masonry or block wall?',
    unitHint: 'Price per m²',
  },
  {
    step: 3,
    key: 'gypsumWallPerM2',
    title: 'Gypsum (drywall) wall',
    description:
      'How much do you charge per square meter for building a gypsum board wall, including finishing to paint-ready level?',
    unitHint: 'Price per m²',
  },
  {
    step: 4,
    key: 'kitchenFullDemolition',
    title: 'Full kitchen demolition & clearance',
    description:
      'What is your fixed price for a complete kitchen strip-out and clearance (cabinets, countertops, appliances disconnected as agreed, and debris removed)?',
    unitHint: 'Fixed project price',
  },
  {
    step: 5,
    key: 'wasteRemoval',
    title: 'Waste container / debris removal',
    description:
      'How much do you charge for a standard waste container rental and pickup, or an equivalent debris removal package?',
    unitHint: 'Typical container / removal price',
  },
]
