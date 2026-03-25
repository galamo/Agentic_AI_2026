export type Expense = {
  id: number;
  expense_date: string;
  expense_type: string;
  amount: number;
  receipt_filename: string | null;
  notes: string | null;
  created_at: string;
};

export type ExpenseListResponse = {
  items: Expense[];
  total_count: number;
};

export type SummaryResponse = {
  by_type: { expense_type: string; total_amount: number }[];
  grand_total: number;
};

export type ReceiptUploadResponse = {
  message: string;
  expense: Expense;
  graph_state: Record<string, unknown>;
};

export type ChatResponse = {
  answer: string;
  sql: string;
  row_count: number;
  rows: Record<string, unknown>[];
};

export type ChatRequest = {
  question: string;
  dateFrom?: string;
  dateTo?: string;
  expenseType?: string;
  limit?: number;
};

export type ExpenseDateTotal = {
  expense_date: string;
  total_amount: number;
};

export type ReportsResponse = {
  grand_total: number;
  expense_count: number;
  by_type: { expense_type: string; total_amount: number }[];
  top_type: { expense_type: string; total_amount: number } | null;
  by_date: ExpenseDateTotal[];
};

function qs(params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") u.set(k, v);
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export async function fetchExpenses(filters: {
  dateFrom?: string;
  dateTo?: string;
  expenseType?: string;
}): Promise<ExpenseListResponse> {
  const q = qs({
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    expense_type: filters.expenseType,
  });
  const res = await fetch(`/api/expenses${q}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchSummary(filters: {
  dateFrom?: string;
  dateTo?: string;
  expenseType?: string;
}): Promise<SummaryResponse> {
  const q = qs({
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    expense_type: filters.expenseType,
  });
  const res = await fetch(`/api/expenses/summary${q}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadReceipt(file: File): Promise<ReceiptUploadResponse> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/receipts", { method: "POST", body });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchReports(filters: {
  dateFrom?: string;
  dateTo?: string;
  expenseType?: string;
}): Promise<ReportsResponse> {
  const q = qs({
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    expense_type: filters.expenseType,
  });
  const res = await fetch(`/api/reports${q}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function chatQuestion(payload: ChatRequest): Promise<ChatResponse> {
  const body = {
    question: payload.question,
    date_from: payload.dateFrom,
    date_to: payload.dateTo,
    expense_type: payload.expenseType,
    limit: payload.limit,
  };
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
