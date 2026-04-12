import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { QuotePageChatbot } from '../components/QuotePageChatbot'
import { PRICING_STEPS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { loadUserData, setQuoteFileMeta } from '../storage'
import { firstIncompleteStep, isPricingComplete } from '../utils/pricingProgress'

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/gif'

export function QuoteRequest() {
  const { username } = useAuth()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pricingTick, setPricingTick] = useState(0)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!username) return null
  if (!isPricingComplete(username)) {
    return <Navigate to={`/pricing/${firstIncompleteStep(username)}`} replace />
  }

  const activeUser = username
  const data = useMemo(
    () => loadUserData(activeUser),
    [activeUser, pricingTick],
  )
  const existing = data.quoteFile

  function onFileChange(fileList: FileList | null) {
    setMessage(null)
    setError(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    const file = fileList?.[0]
    if (!file) return

    const okType =
      file.type === 'application/pdf' || file.type.startsWith('image/')
    if (!okType) {
      setError('Please upload a PDF or an image (JPEG, PNG, WebP, or GIF).')
      return
    }
    const max = 15 * 1024 * 1024
    if (file.size > max) {
      setError('File is too large. Maximum size is 15 MB.')
      return
    }

    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    }

    setQuoteFileMeta(activeUser, {
      name: file.name,
      type: file.type,
      size: file.size,
      submittedAt: new Date().toISOString(),
    })
    setMessage(
      'Your file details were recorded for this quote request. In a production app this file would be sent to the server.',
    )
  }

  return (
    <div className="page">
      <p className="eyebrow">Quote request</p>
      <h1>Upload plans or photos</h1>
      <p className="lede">
        You have entered your standard rates. Upload a PDF or image (site photos, plans, or scope notes) so we can prepare a tailored quote.
      </p>

      <section className="card summary">
        <h2>Your saved rates</h2>
        <ul className="summary-list">
          {PRICING_STEPS.map((s) => (
            <li key={s.key}>
              <span>{s.title}</span>
              <strong>
                {typeof data.pricing[s.key] === 'number'
                  ? data.pricing[s.key]
                  : '—'}
              </strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="card form">
        <label className="field">
          <span>PDF or image</span>
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => onFileChange(e.target.files)}
          />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-success" role="status">{message}</p> : null}
        {previewUrl ? (
          <figure className="preview">
            <img src={previewUrl} alt="Selected upload preview" />
          </figure>
        ) : null}
        {existing ? (
          <p className="muted small">
            Last recorded upload: {existing.name} ({existing.type},{' '}
            {(existing.size / 1024).toFixed(1)} KB) on{' '}
            {new Date(existing.submittedAt).toLocaleString()}
          </p>
        ) : null}
        <Link className="btn btn-secondary inline" to="/pricing/1">
          Edit pricing from step 1
        </Link>
      </section>

      <QuotePageChatbot
        username={activeUser}
        onRatesUpdated={() => setPricingTick((n) => n + 1)}
      />
    </div>
  )
}
