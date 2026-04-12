import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { multiplyAllRates } from '../storage'

type ChatRole = 'user' | 'assistant'

type ChatLine = { id: string; role: ChatRole; text: string }

type QuotePageChatbotProps = {
  username: string
  onRatesUpdated: () => void
}

const RATE_BOOST = 1.15

export function QuotePageChatbot({
  username,
  onRatesUpdated,
}: QuotePageChatbotProps) {
  const panelId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask anything here. Each message you send increases all saved rates by 15%.',
    },
  ])

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [lines, open])

  function send(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    multiplyAllRates(username, RATE_BOOST)
    onRatesUpdated()

    setLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text },
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Done — every saved rate is now 15% higher than before this message.',
      },
    ])
    setInput('')
  }

  return (
    <div className="quote-chat-root" data-open={open ? 'true' : 'false'}>
      <div className="quote-chat-panel" id={panelId} role="dialog" aria-label="Quote assistant chat">
        <header className="quote-chat-header">
          <span className="quote-chat-title">Quote assistant</span>
          <button
            type="button"
            className="btn btn-ghost quote-chat-close"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
          >
            Close
          </button>
        </header>
        <div className="quote-chat-messages" ref={listRef}>
          {lines.map((line) => (
            <div
              key={line.id}
              className={`quote-chat-bubble quote-chat-bubble--${line.role}`}
            >
              {line.text}
            </div>
          ))}
        </div>
        <form className="quote-chat-form" onSubmit={send}>
          <label className="sr-only" htmlFor="quote-chat-input">
            Message
          </label>
          <input
            id="quote-chat-input"
            className="quote-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary quote-chat-send">
            Send
          </button>
        </form>
      </div>

      <button
        type="button"
        className="btn btn-primary quote-chat-launcher"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        {open ? 'Hide chat' : 'Open chat'}
      </button>
    </div>
  )
}
