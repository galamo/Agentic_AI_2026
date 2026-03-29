export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type InterruptInfo = {
  id: string;
  value: unknown;
};

export type ChatStartRequest = {
  question: string;
  history?: ChatTurn[];
  session_id?: string | null;
  /** @deprecated use session_id */
  thread_id?: string | null;
};

export type ChatResponse = {
  session_id: string;
  thread_id: string;
  model?: string | null;
  answer: string | null;
  interrupt: InterruptInfo | null;
};

export type ChatResumeRequest = {
  session_id?: string | null;
  thread_id?: string | null;
  interrupt_id: string;
  resume_value: unknown;
  history?: ChatTurn[];
};

export type ChatHistoryResponse = {
  session_id: string;
  history: ChatTurn[];
};

const SESSION_STORAGE_KEY = "lab24_session_id";

export function getStoredSessionId(): string | null {
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

export function setStoredSessionId(id: string | null) {
  if (id) sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  else sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function fetchChatHistory(sessionId: string): Promise<ChatHistoryResponse> {
  const res = await fetch(`/api/chat/history/${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function chatStart(payload: ChatStartRequest): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function chatResume(payload: ChatResumeRequest): Promise<ChatResponse> {
  const res = await fetch("/api/chat/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
