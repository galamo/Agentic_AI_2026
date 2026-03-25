import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { chatQuestion, fetchReports, type ChatResponse, type ReportsResponse } from "../api";
import type { ChatRequest } from "../api";

type Row = Record<string, unknown>;

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function TableFromRows({ rows }: { rows: Row[] }) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  return (
    <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
      <table>
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              {keys.map((k) => (
                <td key={`${idx}-${k}`}>{r[k] == null ? "—" : String(r[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expenseType, setExpenseType] = useState("");

  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatResult, setChatResult] = useState<ChatResponse | null>(null);

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      expenseType: expenseType.trim() || undefined,
    }),
    [dateFrom, dateTo, expenseType],
  );

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const r = await fetchReports(filters);
      setReports(r);
    } catch (err) {
      setReportsError(err instanceof Error ? err.message : String(err));
    } finally {
      setReportsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const onAsk = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!question.trim()) return;
      setChatLoading(true);
      setChatError(null);
      setChatResult(null);
      try {
        const payload: ChatRequest = {
          question: question.trim(),
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          expenseType: filters.expenseType,
          limit: 50,
        };
        const res = await chatQuestion(payload);
        setChatResult(res);
      } catch (err) {
        setChatError(err instanceof Error ? err.message : String(err));
      } finally {
        setChatLoading(false);
      }
    },
    [question, filters],
  );

  return (
    <div>
      <div className="card">
        <h2>Filters</h2>
        <p className="muted">Use the same filters for deterministic reports and the SQL chatbot.</p>
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label htmlFor="rf-df">From</label>
            <input id="rf-df" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rf-dt">To</label>
            <input id="rf-dt" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rf-et">Type (exact)</label>
            <input
              id="rf-et"
              type="text"
              placeholder="e.g. food"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
            />
          </div>
          <button className="btn-secondary btn" type="button" onClick={() => void loadReports()} disabled={reportsLoading}>
            Refresh
          </button>
        </div>
        {reportsError && <p className="error" style={{ marginTop: "0.75rem" }}>{reportsError}</p>}
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Reports</h2>
          <p className="muted">
            {reportsLoading ? "Loading…" : `${reports?.expense_count ?? 0} expenses · grand total: ${formatMoney(reports?.grand_total ?? 0)}`}
          </p>

          {reports && (
            <>
              <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.by_type.map((r) => (
                      <tr key={r.expense_type}>
                        <td>{r.expense_type}</td>
                        <td>{formatMoney(r.total_amount)}</td>
                      </tr>
                    ))}
                    {reports.by_type.length === 0 && (
                      <tr>
                        <td colSpan={2} className="muted">
                          No matching expenses.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {reports.by_date.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Totals by date</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.by_date.slice(0, 20).map((r) => (
                          <tr key={r.expense_date}>
                            <td>{r.expense_date}</td>
                            <td>{formatMoney(r.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reports.by_date.length > 20 && <p className="muted" style={{ marginTop: "0.5rem" }}>Showing first 20 dates.</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h2>SQL Chatbot</h2>
          <p className="muted">Ask questions about expenses. The backend generates a SELECT SQL query, executes it, and answers.</p>

          <form onSubmit={onAsk} style={{ marginTop: "0.75rem" }}>
            <div className="field" style={{ marginBottom: "0.75rem" }}>
              <label htmlFor="rq">Your question</label>
              <input
                id="rq"
                type="text"
                value={question}
                placeholder="e.g. total spend by type, and the top type"
                onChange={(e) => setQuestion(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <button className="btn" type="submit" disabled={chatLoading || !question.trim()}>
              {chatLoading ? "Thinking…" : "Ask"}
            </button>
          </form>

          {chatError && <p className="error" style={{ marginTop: "0.75rem" }}>{chatError}</p>}

          {chatResult && (
            <div style={{ marginTop: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Answer</h3>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{chatResult.answer}</p>

              <h3 style={{ margin: "1rem 0 0.5rem", fontSize: "1rem" }}>Generated SQL</h3>
              <pre className="mono">{chatResult.sql}</pre>

              {chatResult.rows.length > 0 ? (
                <>
                  <p className="muted">Rows returned: {chatResult.row_count}</p>
                  <TableFromRows rows={chatResult.rows} />
                </>
              ) : (
                <p className="muted" style={{ marginTop: "0.5rem" }}>No rows returned for the current filters.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

