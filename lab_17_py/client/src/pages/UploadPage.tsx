import { useState } from "react";
import { uploadReceipt } from "../api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await uploadReceipt(file);
      setResult(JSON.stringify({ message: data.message, expense: data.expense, graph_state: data.graph_state }, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Upload a receipt</h2>
        <p className="muted">
          The file is sent to the Python API, passed through the LangGraph receipt chain (stub), and stored as an expense
          row with placeholder fields until you implement extraction.
        </p>
        <form onSubmit={onSubmit}>
          <div className="row" style={{ marginTop: "0.75rem" }}>
            <div className="field">
              <label htmlFor="receipt">Image file</label>
              <input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
              />
            </div>
            <button className="btn" type="submit" disabled={!file || loading}>
              {loading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
        {error && <p className="error" style={{ marginTop: "0.75rem" }}>{error}</p>}
      </div>
      {result && (
        <div className="card">
          <h2>API response</h2>
          <pre className="mono">{result}</pre>
        </div>
      )}
    </div>
  );
}
