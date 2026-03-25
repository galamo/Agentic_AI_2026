"""
Schema-as-vector retrieval (in-memory).

We embed the `expenses` schema DDL into vectors at runtime, then retrieve the
most relevant chunks for a user question. This provides the "Schema SQL as
vector" RAG step for the SQL chatbot.
"""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass
from math import sqrt
from typing import List, Sequence

from langchain_openai import OpenAIEmbeddings


SCHEMA_SQL = """
-- Lab 17 expenses schema (used for SQL chatbot + schema-as-vector retrieval)
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  expense_type VARCHAR(128) NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  receipt_filename VARCHAR(512),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_expenses_expense_date ON expenses (expense_date);
CREATE INDEX ix_expenses_expense_type ON expenses (expense_type);
""".strip()


def _chunk_text(text: str, *, max_chars: int = 700) -> List[str]:
    """
    Simple chunking: keep DDL statements grouped and fall back to fixed windows.
    """

    # Split by semicolons but keep the semicolon.
    parts: List[str] = []
    for stmt in text.split(";"):
        s = stmt.strip()
        if not s:
            continue
        parts.append(s + ";")

    chunks: List[str] = []
    cur: List[str] = []
    cur_len = 0
    for p in parts:
        if cur_len + len(p) > max_chars and cur:
            chunks.append("\n".join(cur))
            cur = [p]
            cur_len = len(p)
        else:
            cur.append(p)
            cur_len += len(p)

    if cur:
        chunks.append("\n".join(cur))

    # If still too large, hard-split.
    out: List[str] = []
    for c in chunks:
        if len(c) <= max_chars:
            out.append(c)
        else:
            for i in range(0, len(c), max_chars):
                out.append(c[i : i + max_chars])
    return out


def _cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for x, y in zip(a, b):
        dot += x * y
        norm_a += x * x
        norm_b += y * y
    denom = sqrt(norm_a) * sqrt(norm_b)
    if denom == 0:
        return 0.0
    return dot / denom


@dataclass(frozen=True)
class _SchemaIndex:
    chunks: List[str]
    vectors: List[List[float]]
    embeddings: OpenAIEmbeddings


_index_lock = threading.Lock()
_schema_index: _SchemaIndex | None = None


def ensure_schema_index() -> _SchemaIndex:
    global _schema_index
    if _schema_index is not None:
        return _schema_index

    with _index_lock:
        if _schema_index is not None:
            return _schema_index

        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("Missing OPENROUTER_API_KEY (required for schema embeddings).")

        embedding_model = os.environ.get("EMBEDDING_MODEL", "openai/text-embedding-3-small")
        embeddings = OpenAIEmbeddings(
            model=embedding_model,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )

        chunks = _chunk_text(SCHEMA_SQL)
        vectors = embeddings.embed_documents(chunks)
        _schema_index = _SchemaIndex(chunks=chunks, vectors=vectors, embeddings=embeddings)
        return _schema_index


def retrieve_schema_context(question: str, *, top_k: int = 4) -> str:
    """
    Return a short schema context string to be included in the SQL generator prompt.
    """
    idx = ensure_schema_index()
    q_vec = idx.embeddings.embed_query(question)
    scored = [
        (_cosine_similarity(q_vec, vec), i)
        for i, vec in enumerate(idx.vectors)
    ]
    scored.sort(reverse=True, key=lambda t: t[0])
    best = [i for _, i in scored[: max(1, top_k)]]
    picked_chunks = [idx.chunks[i] for i in best]

    return "Schema context (DDL chunks):\n\n" + "\n\n---\n\n".join(picked_chunks)

