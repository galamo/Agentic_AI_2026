import { type FormEvent, useCallback, useMemo, useState } from "react";
import type { ChatResponse, ChatTurn } from "../api";
import { chat } from "../api";

function formatModelLabel(model: string | null | undefined) {
  if (!model) return null;
  return `Model: ${model}`;
}

export default function ChatPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);

  const canSend = useMemo(() => !loading && question.trim().length > 0, [loading, question]);

  const onSend = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!canSend) return;

      setLoading(true);
      setError(null);
      setLastResponse(null);

      const userText = question.trim();
      setQuestion("");

      const nextTurns: ChatTurn[] = [...turns, { role: "user", content: userText }];
      setTurns(nextTurns);

      try {
        const res = await chat({
          question: userText,
          history: turns,
        });
        setLastResponse(res);
        setTurns([...nextTurns, { role: "assistant", content: res.answer }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [canSend, turns, question],
  );

  return (
    <div className="app-shell">
      <div className="top-nav">
        <div className="brand">Lab 22 — Room Booking Chatbot</div>
        <div className="muted">{formatModelLabel(lastResponse?.model ?? null)}</div>
      </div>

      <div className="card">
        <h2>Chat</h2>
        <p className="muted">LangGraph + Playwright. Turns your request into a booking attempt.</p>

        <div className="chat-thread" style={{ marginTop: "0.75rem" }}>
          {turns.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Describe a meeting booking (room + time + who + what).
            </p>
          ) : (
            turns.map((t, idx) => (
              <div key={`${t.role}-${idx}`} className={`turn ${t.role}`}>
                <div className="meta">
                  <span>{t.role === "user" ? "You" : "Assistant"}</span>
                  <span className="mono">{t.role}</span>
                </div>
                <div className="content">{t.content}</div>
              </div>
            ))
          )}
        </div>

        {error && (
          <p className="error" style={{ marginTop: "0.75rem" }}>
            {error}
          </p>
        )}

        <form className="chat-actions" onSubmit={onSend}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="q">Your booking request</label>
            <textarea
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='Example: "Book room 3 tomorrow at 10:00 for Alice: Project sync"'
              disabled={loading}
            />
          </div>
          <button className="btn" type="submit" disabled={!canSend}>
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

