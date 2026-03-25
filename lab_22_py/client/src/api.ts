export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  question: string;
  history?: ChatTurn[];
};

export type ChatResponse = {
  answer: string;
  model?: string | null;
};

export async function chat(payload: ChatRequest): Promise<ChatResponse> {
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

