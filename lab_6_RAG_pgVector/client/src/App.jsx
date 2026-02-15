import { useState } from "react";
import "./App.css";

const API_BASE = "/api";

async function askQuestion(message) {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: message.trim() }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data.answer;
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setError(null);
    setLoading(true);
    try {
      const answer = await askQuestion(q);
      setHistory((prev) => [...prev, { question: q, answer }]);
      setQuestion("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Construction pricing QA</h1>
        <p className="subtitle">
          Ask anything about the data in the pgvector database (demolition, bathroom, kitchen, etc.)
        </p>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="input"
          placeholder="e.g. How much to remove a load-bearing wall?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="button" disabled={loading || !question.trim()}>
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <section className="answers">
        {history.length === 0 && !loading && (
          <p className="placeholder">Your questions and answers will appear here.</p>
        )}
        {history.map((item, i) => (
          <div key={i} className="qa-block">
            <div className="question">Q: {item.question}</div>
            <div className="answer">{item.answer}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
