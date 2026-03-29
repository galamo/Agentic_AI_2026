import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ChatResponse, ChatTurn, InterruptInfo } from "../api";
import {
  chatResume,
  chatStart,
  fetchChatHistory,
  getStoredSessionId,
  setStoredSessionId,
} from "../api";

function formatModelLabel(model: string | null | undefined) {
  if (!model) return null;
  return `Model: ${model}`;
}

const FIELD_LABELS: Record<string, string> = {
  room: "Room number (1-10)",
  user_name: "Your name",
  meeting_description: "Meeting description",
  start_datetime_local: "Start (YYYY-MM-DDTHH:00)",
};

type HitlPayload = {
  type?: string;
  missing_fields?: string[];
  message?: string;
  partial_intent?: Record<string, unknown>;
  hints?: Record<string, string>;
};

function isHitlPayload(v: unknown): v is HitlPayload {
  return typeof v === "object" && v !== null;
}

export default function ChatPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [pendingInterrupt, setPendingInterrupt] = useState<InterruptInfo | null>(null);
  const [hitlValues, setHitlValues] = useState<Record<string, string>>({});

  const hitlPayload = useMemo((): HitlPayload | null => {
    if (!pendingInterrupt || !isHitlPayload(pendingInterrupt.value)) return null;
    return pendingInterrupt.value;
  }, [pendingInterrupt]);

  const missingFields = hitlPayload?.missing_fields ?? [];

  const canSend = useMemo(
    () => !loading && !pendingInterrupt && question.trim().length > 0,
    [loading, pendingInterrupt, question],
  );

  const canSubmitHitl = useMemo(() => {
    if (!pendingInterrupt || missingFields.length === 0) return false;
    return missingFields.every((k) => (hitlValues[k] ?? "").trim().length > 0);
  }, [pendingInterrupt, missingFields, hitlValues]);

  const applyResponse = useCallback((res: ChatResponse) => {
    setLastResponse(res);
    const sid = res.session_id || res.thread_id;
    setThreadId(sid);
    setStoredSessionId(sid);

    if (res.interrupt) {
      setPendingInterrupt(res.interrupt);
      const p = isHitlPayload(res.interrupt.value) ? res.interrupt.value : null;
      const next: Record<string, string> = {};
      for (const k of p?.missing_fields ?? []) {
        const partial = p?.partial_intent?.[k];
        next[k] = partial != null && partial !== "" ? String(partial) : "";
      }
      setHitlValues(next);

      const msg =
        (p?.message && String(p.message)) || "I need a bit more information to complete the booking.";
      return msg;
    }

    setPendingInterrupt(null);
    setHitlValues({});
    const ans = res.answer ?? "";
    return ans;
  }, []);

  useEffect(() => {
    const sid = getStoredSessionId();
    if (!sid) return;
    setThreadId(sid);
    let cancelled = false;
    fetchChatHistory(sid)
      .then((data) => {
        if (cancelled || data.history.length === 0) return;
        setTurns((prev) => (prev.length === 0 ? data.history : prev));
      })
      .catch(() => {
        setStoredSessionId(null);
        if (!cancelled) setThreadId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        const res = await chatStart({
          question: userText,
          session_id: threadId ?? undefined,
        });
        const assistantText = applyResponse(res);
        setTurns([...nextTurns, { role: "assistant", content: assistantText }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [canSend, turns, question, threadId, applyResponse],
  );

  const onSubmitHitl = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!pendingInterrupt || !threadId || !canSubmitHitl) return;

      setLoading(true);
      setError(null);

      const resumeObj: Record<string, string | number> = {};
      for (const k of missingFields) {
        const raw = (hitlValues[k] ?? "").trim();
        if (k === "room") {
          resumeObj[k] = Number.parseInt(raw, 10);
        } else {
          resumeObj[k] = raw;
        }
      }

      try {
        const res = await chatResume({
          session_id: threadId,
          interrupt_id: pendingInterrupt.id,
          resume_value: resumeObj,
        });
        const assistantText = applyResponse(res);
        setTurns((prev) => [...prev, { role: "assistant", content: assistantText }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [pendingInterrupt, threadId, canSubmitHitl, missingFields, hitlValues, turns, applyResponse],
  );

  return (
    <div className="app-shell">
      <div className="top-nav">
        <div className="brand">Lab 24 — Room Booking (human-in-the-loop)</div>
        <div className="muted">{formatModelLabel(lastResponse?.model ?? null)}</div>
      </div>

      <div className="card">
        <h2>Chat</h2>
        <p className="muted">
          Same flow as Lab 22, but missing booking fields pause the agent until you supply them (LangGraph{" "}
          <span className="mono">interrupt</span> / <span className="mono">resume</span>).
        </p>

        <div className="chat-thread" style={{ marginTop: "0.75rem" }}>
          {turns.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Try an incomplete request, e.g. &quot;Book a meeting tomorrow at 10:00 for Dana: standup&quot; (no room).
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

        {pendingInterrupt && hitlPayload && (
          <div className="hitl-panel">
            <h3>Your details</h3>
            <p className="muted" style={{ margin: 0 }}>
              Fill in the missing fields, then submit. Thread: <span className="mono">{threadId}</span>
            </p>
            <form className="hitl-fields" onSubmit={onSubmitHitl}>
              {missingFields.map((key) => (
                <div key={key} className="field">
                  <label htmlFor={`hitl-${key}`}>{FIELD_LABELS[key] ?? key}</label>
                  {hitlPayload.hints?.[key] && (
                    <span className="muted" style={{ fontSize: "0.75rem" }}>
                      {hitlPayload.hints[key]}
                    </span>
                  )}
                  {key === "meeting_description" ? (
                    <textarea
                      id={`hitl-${key}`}
                      value={hitlValues[key] ?? ""}
                      onChange={(ev) => setHitlValues((s) => ({ ...s, [key]: ev.target.value }))}
                      disabled={loading}
                      rows={3}
                    />
                  ) : (
                    <input
                      id={`hitl-${key}`}
                      type={key === "room" ? "number" : "text"}
                      min={key === "room" ? 1 : undefined}
                      max={key === "room" ? 10 : undefined}
                      value={hitlValues[key] ?? ""}
                      onChange={(ev) => setHitlValues((s) => ({ ...s, [key]: ev.target.value }))}
                      disabled={loading}
                      placeholder={key === "start_datetime_local" ? "2026-03-30T10:00" : undefined}
                    />
                  )}
                </div>
              ))}
              <button className="btn" type="submit" disabled={loading || !canSubmitHitl}>
                {loading ? "Submitting…" : "Submit missing details"}
              </button>
            </form>
          </div>
        )}

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
              disabled={loading || !!pendingInterrupt}
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
