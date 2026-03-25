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
  model: string;
};

export async function chat(payload: ChatRequest): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

