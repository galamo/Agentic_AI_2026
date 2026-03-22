import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Expense } from "../api";
import { fetchExpenses, fetchSummary } from "../api";

const COLORS = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#a855f7", "#ec4899", "#14b8a6"];

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function ExpensesPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [items, setItems] = useState<Expense[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [chartRows, setChartRows] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      expenseType: expenseType.trim() || undefined,
    }),
    [dateFrom, dateTo, expenseType],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, summary] = await Promise.all([fetchExpenses(filters), fetchSummary(filters)]);
      setItems(list.items);
      setGrandTotal(summary.grand_total);
      setChartRows(
        summary.by_type.map((r) => ({
          name: r.expense_type,
          value: r.total_amount,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="card">
        <h2>Filters</h2>
        <p className="muted">Narrow expenses by date range and type. Summary and table use the same filters.</p>
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label htmlFor="df">From</label>
            <input id="df" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="dt">To</label>
            <input id="dt" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="et">Type (exact)</label>
            <input
              id="et"
              type="text"
              placeholder="e.g. food"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
            />
          </div>
          <button className="btn-secondary btn" type="button" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
        {error && <p className="error" style={{ marginTop: "0.75rem" }}>{error}</p>}
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Expenses</h2>
          <p className="muted">
            {loading ? "Loading…" : `${items.length} row(s) · total amount in range: ${formatMoney(grandTotal)}`}
          </p>
          <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id}>
                    <td>{e.expense_date}</td>
                    <td>{e.expense_type}</td>
                    <td>{formatMoney(e.amount)}</td>
                    <td className="muted">{e.receipt_filename ?? "—"}</td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      No rows match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>By type (pie)</h2>
          <p className="muted">Aggregated amounts for the current filter set.</p>
          <div style={{ width: "100%", height: 320 }}>
            {chartRows.length === 0 && !loading ? (
              <p className="muted" style={{ paddingTop: "2rem" }}>
                No amounts to chart for the current filters.
              </p>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={chartRows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {chartRows.map((_, i) => (
                      <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
