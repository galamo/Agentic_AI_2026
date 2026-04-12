import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PRICING_STEPS } from '../constants'
import { useAuth } from '../context/AuthContext'
import type { PricingStepDef } from '../types'
import { loadUserData, updatePricing } from '../storage'
import { firstIncompleteStep } from '../utils/pricingProgress'

function parseAmount(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(',', '.'))
  if (Number.isNaN(n) || n < 0) return null
  return n
}

type StepBodyProps = {
  activeUser: string
  stepDef: PricingStepDef
  step: number
}

function PricingStepBody({ activeUser, stepDef, step }: StepBodyProps) {
  const navigate = useNavigate()
  const [value, setValue] = useState(() => {
    const saved = loadUserData(activeUser).pricing[stepDef.key]
    return typeof saved === 'number' ? String(saved) : ''
  })
  const [fieldError, setFieldError] = useState<string | null>(null)

  function goBack() {
    if (step > 1) navigate(`/pricing/${step - 1}`)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldError(null)
    const amount = parseAmount(value.trim())
    if (amount === null) {
      setFieldError('Enter a valid non-negative number.')
      return
    }
    updatePricing(activeUser, stepDef.key, amount)
    if (step < PRICING_STEPS.length) navigate(`/pricing/${step + 1}`)
    else navigate('/quote')
  }

  return (
    <>
      <h1>{stepDef.title}</h1>
      <p className="lede">{stepDef.description}</p>
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>{stepDef.unitHint}</span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            aria-invalid={!!fieldError}
          />
        </label>
        {fieldError ? <p className="form-error" role="alert">{fieldError}</p> : null}
        <div className="row">
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={goBack}>
              Back
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-primary">
            {step < PRICING_STEPS.length ? 'Save and continue' : 'Save and request quote'}
          </button>
        </div>
      </form>
    </>
  )
}

export function PricingPage() {
  const { step: stepParam } = useParams()
  const step = Number.parseInt(stepParam ?? '', 10)
  const { username } = useAuth()

  const def = PRICING_STEPS.find((s) => s.step === step)

  if (!username) return null
  if (!def || Number.isNaN(step) || step < 1 || step > PRICING_STEPS.length) {
    return <Navigate to={`/pricing/${firstIncompleteStep(username)}`} replace />
  }

  const activeUser = username
  const stepDef = def

  return (
    <div className="page">
      <p className="eyebrow">
        Let&apos;s know your pricing — step {step} of {PRICING_STEPS.length}
      </p>
      <PricingStepBody
        key={`${activeUser}-${stepDef.step}`}
        activeUser={activeUser}
        stepDef={stepDef}
        step={step}
      />
    </div>
  )
}
