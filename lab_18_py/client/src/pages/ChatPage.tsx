import { type FormEvent, useCallback, useMemo, useState } from "react";
import type { ChatResponse, ChatTurn } from "../api";
import { chat } from "../api";

function formatModelLabel(model: string | null) {
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
        <div className="brand">Lab 18 — Ollama Chatbot</div>
        <div className="muted">{formatModelLabel(lastResponse?.model ?? null)}</div>
      </div>

      <div className="card">
        <h2>Chat</h2>
        <p className="muted">LangGraph + Ollama. The backend only calls the model (no tools).</p>

        <div className="chat-thread" style={{ marginTop: "0.75rem" }}>
          {turns.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Ask a question to the model.</p>
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

        {error && <p className="error" style={{ marginTop: "0.75rem" }}>{error}</p>}

        <form className="chat-actions" onSubmit={onSend}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="q">Your question</label>
            <textarea
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is the difference between HTTP and HTTPS?"
              disabled={loading}
            />
          </div>
          <button className="btn" type="submit" disabled={!canSend}>
            {loading ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

