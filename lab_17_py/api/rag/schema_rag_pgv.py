"""
Schema-as-vector retrieval using Postgres + pgvector.

This module:
1) Loads the SQL DDL from `lab_17_py/schema.sql`
2) Chunks it
3) Embeds the chunks and stores them in a pgvector table (`schema_vectors`)
4) Retrieves the most relevant chunks for a user question

This provides the "Schema SQL as vector" RAG step for the SQL chatbot.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import uuid
from pathlib import Path
from typing import List

from langchain_openai import OpenAIEmbeddings
from sqlalchemy import text

from api.db import engine

_index_lock = threading.Lock()
_indexed_schema_hash: str | None = None

LAB_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_SQL_PATH = LAB_ROOT / "schema.sql"

VECTOR_TABLE = os.environ.get("SCHEMA_VECTOR_TABLE", "schema_vectors")


def _validate_identifier(name: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        raise ValueError(f"Invalid SQL identifier: {name!r}")
    return name


def _load_schema_sql() -> str:
    if not SCHEMA_SQL_PATH.exists():
        raise RuntimeError(f"Missing schema DDL file: {SCHEMA_SQL_PATH}")
    return SCHEMA_SQL_PATH.read_text(encoding="utf-8").strip()


def _schema_hash(schema_text: str) -> str:
    return hashlib.sha256(schema_text.encode("utf-8")).hexdigest()


def _chunk_text(text: str, *, max_chars: int = 700) -> List[str]:
    """
    Simple chunking: keep DDL statements grouped and fall back to fixed windows.
    """
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

    out: List[str] = []
    for c in chunks:
        if len(c) <= max_chars:
            out.append(c)
        else:
            for i in range(0, len(c), max_chars):
                out.append(c[i : i + max_chars])
    return out


def _embedding_dim_for_model(model: str) -> int:
    """
    Default dimensions:
    - text-embedding-3-small => 1536
    - text-embedding-3-large => 3072
    """
    override = os.environ.get("SCHEMA_VECTOR_DIM")
    if override:
        return int(override)
    if "large" in model:
        return 3072
    return 1536


def _vector_to_pg(vec: List[float]) -> str:
    # pgvector accepts values like: [0.1,0.2,...]
    return "[" + ",".join(str(float(x)) for x in vec) + "]"


def _ensure_vector_table(*, dim: int) -> str:
    table = _validate_identifier(VECTOR_TABLE)
    with engine.begin() as conn:
        conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector;")
        conn.exec_driver_sql(
            f"""
            CREATE TABLE IF NOT EXISTS {table} (
              id uuid PRIMARY KEY,
              content text NOT NULL,
              metadata jsonb NOT NULL,
              embedding vector({dim}) NOT NULL
            );
            """
        )
        conn.exec_driver_sql(
            f"""
            CREATE INDEX IF NOT EXISTS {table}_embedding_ivfflat
            ON {table}
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
            """
        )
    return table


def ensure_schema_vector_index() -> None:
    """
    Ensure schema chunks are indexed in pgvector for the *current* `schema.sql`.
    """
    global _indexed_schema_hash

    schema_text = _load_schema_sql()
    s_hash = _schema_hash(schema_text)

    if _indexed_schema_hash == s_hash:
        return

    with _index_lock:
        if _indexed_schema_hash == s_hash:
            return

        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("Missing OPENROUTER_API_KEY (required for schema embeddings).")

        embedding_model = os.environ.get("EMBEDDING_MODEL", "openai/text-embedding-3-small")
        dim = _embedding_dim_for_model(embedding_model)

        table = _ensure_vector_table(dim=dim)

        with engine.begin() as conn:
            existing = conn.execute(
                text(f"SELECT COUNT(*) FROM {table} WHERE metadata->>'schema_hash' = :schema_hash"),
                {"schema_hash": s_hash},
            ).scalar_one()

            if int(existing) > 0:
                _indexed_schema_hash = s_hash
                return

        embeddings = OpenAIEmbeddings(
            model=embedding_model,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )

        chunks = _chunk_text(schema_text)
        if not chunks:
            raise RuntimeError("schema.sql produced zero chunks; cannot build schema vector index.")

        vectors = embeddings.embed_documents(chunks)
        if len(vectors) != len(chunks):
            raise RuntimeError("Embedding count mismatch; cannot build schema vector index.")

        metadata_base = {"schema_hash": s_hash, "source": "lab_17_py/schema.sql"}

        rows = []
        for chunk, vec in zip(chunks, vectors, strict=True):
            rows.append(
                {
                    "id": str(uuid.uuid4()),
                    "content": chunk,
                    "metadata": json.dumps(metadata_base),
                    "embedding": _vector_to_pg(vec),
                }
            )

        with engine.begin() as conn:
            for r in rows:
                conn.execute(
                    text(
                        f"""
                        INSERT INTO {table} (id, content, metadata, embedding)
                        VALUES (:id, :content, :metadata::jsonb, :embedding::vector({dim}))
                        ON CONFLICT (id) DO NOTHING;
                        """
                    ),
                    r,
                )

        _indexed_schema_hash = s_hash


def retrieve_schema_context(question: str, *, top_k: int = 4) -> str:
    """
    Return a short schema context string to be included in the SQL generator prompt.
    """
    schema_text = _load_schema_sql()
    s_hash = _schema_hash(schema_text)
    table = _validate_identifier(VECTOR_TABLE)

    ensure_schema_vector_index()

    embedding_model = os.environ.get("EMBEDDING_MODEL", "openai/text-embedding-3-small")
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("Missing OPENROUTER_API_KEY (required for schema embeddings).")

    embeddings = OpenAIEmbeddings(
        model=embedding_model,
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
    )
    q_vec = embeddings.embed_query(question)
    q_pg = _vector_to_pg(q_vec)

    dim = _embedding_dim_for_model(embedding_model)

    with engine.begin() as conn:
        limit = max(1, int(top_k))
        picked = conn.execute(
            text(
                f"""
                SELECT content
                FROM {table}
                WHERE metadata->>'schema_hash' = :schema_hash
                ORDER BY embedding <=> :q_embedding::vector({dim})
                LIMIT :limit
                """
            ),
            {"schema_hash": s_hash, "q_embedding": q_pg, "limit": limit},
        ).all()

    picked_chunks = [row[0] for row in picked]
    if not picked_chunks:
        return "Schema context (DDL chunks):\n\n"

    return "Schema context (DDL chunks):\n\n" + "\n\n---\n\n".join(picked_chunks)

