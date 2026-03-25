"""
SQL chatbot for Lab 17.

Pipeline:
1) Retrieve relevant schema chunks from the schema-as-vector index (LangChain)
2) Use an LLM to generate a single read-only SQL query
3) Execute the SQL against the `expenses` table
4) Ask the LLM to answer the user question based on the query + rows
"""

from __future__ import annotations

import json
import os
import re
from datetime import date
from decimal import Decimal
from typing import Any, Sequence

from fastapi import HTTPException
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.rag.schema_rag_pgv import retrieve_schema_context


_DISALLOWED_SQL_KEYWORDS = {
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "create",
    "truncate",
    "grant",
    "revoke",
    "copy",
    "comment",
    "do $$",
}


def _get_llm(api_key: str) -> ChatOpenAI:
    model_name = os.environ.get("SQL_CHAT_MODEL", "openai/gpt-4o-mini")
    return ChatOpenAI(
        model=model_name,
        temperature=0,
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def _strip_json_fences(raw: str) -> str:
    cleaned = re.sub(r"```json\\s*|```", "", raw).strip()
    return cleaned


def _validate_sql_readonly(sql: str) -> None:
    s = sql.strip().lower()
    if not s.startswith("select"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")
    if ";" in s:
        raise HTTPException(status_code=400, detail="Semicolons are not allowed in generated SQL.")

    for kw in _DISALLOWED_SQL_KEYWORDS:
        if kw in s:
            raise HTTPException(status_code=400, detail=f"Disallowed SQL keyword: {kw!r}")


def _ensure_limit(sql: str, *, limit: int) -> str:
    s = sql.strip()
    if re.search(r"\\blimit\\b", s, flags=re.IGNORECASE):
        return s
    return f"{s}\nLIMIT {limit}"


def _serialize_value(v: Any) -> Any:
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, date):
        return v.isoformat()
    return str(v)


def _rows_to_dicts(rows: Sequence[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in rows:
        mapping = getattr(r, "_mapping", None)
        if mapping is not None:
            out.append({k: _serialize_value(v) for k, v in mapping.items()})
        else:
            # Fallback: best-effort serialization
            out.append({"value": _serialize_value(r)})
    return out


def generate_sql(
    *,
    question: str,
    schema_context: str,
    date_from: date | None,
    date_to: date | None,
    expense_type: str | None,
    limit: int,
) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing OPENROUTER_API_KEY.")

    llm = _get_llm(api_key)

    type_filter = expense_type.strip() if expense_type else None
    filters_txt = (
        f"date_from={date_from.isoformat() if date_from else None}, "
        f"date_to={date_to.isoformat() if date_to else None}, "
        f"expense_type={type_filter!r}"
    )

    system_prompt = """You are a meticulous SQL generator for a read-only analytics chatbot.

You must:
- Generate ONE SQL query that answers the user question.
- Use ONLY the `expenses` table and its columns:
  id, expense_date, expense_type, amount, receipt_filename, notes, created_at
- Use the provided filters (if non-null) to restrict the rows:
  expense_date bounds on expense_date
  exact match on expense_type
- Always include an ORDER BY if it’s helpful (e.g. for time series or top-N).
- Output JSON ONLY with this exact schema:
  {"sql":"<SQL here>"}

Safety:
- SQL must be SELECT-only (no writes).
- No semicolons.
"""

    user_prompt = (
        f"Schema context:\n{schema_context}\n\n"
        f"User question:\n{question}\n\n"
        f"Requested filters:\n{filters_txt}\n\n"
        f"Row limit for the result set: {limit}\n\n"
        "Generate the SQL now."
    )

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    response = llm.invoke(messages)
    raw = response.content if isinstance(response.content, str) else str(response.content)
    cleaned = _strip_json_fences(raw)
    parsed = json.loads(cleaned)
    sql = str(parsed["sql"])
    sql = _ensure_limit(sql, limit=limit)
    _validate_sql_readonly(sql)
    return sql


def answer_from_rows(*, question: str, sql: str, rows: list[dict[str, Any]], limit: int) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing OPENROUTER_API_KEY.")

    llm = _get_llm(api_key)
    rows_preview = rows[:limit]
    user_prompt = (
        f"User question:\n{question}\n\n"
        f"Executed SQL:\n{sql}\n\n"
        f"Query rows (JSON):\n{json.dumps(rows_preview, ensure_ascii=False)}\n\n"
        "Write a concise natural-language answer using the rows. "
        "If rows are empty, say you couldn't find matching expenses and suggest relaxing filters."
    )
    system_prompt = "You answer as an analytics assistant. Be concise, factual, and refer to values from the rows."
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    response = llm.invoke(messages)
    raw = response.content if isinstance(response.content, str) else str(response.content)
    return str(raw).strip()


def run_sql_chat(
    *,
    db: Session,
    question: str,
    date_from: date | None,
    date_to: date | None,
    expense_type: str | None,
    limit: int,
) -> tuple[str, str, list[dict[str, Any]]]:
    schema_context = retrieve_schema_context(question, top_k=4)
    sql = generate_sql(
        question=question,
        schema_context=schema_context,
        date_from=date_from,
        date_to=date_to,
        expense_type=expense_type,
        limit=limit,
    )

    try:
        result = db.execute(text(sql))
        fetched = result.all()
    except Exception as e:  # pragma: no cover (depends on runtime DB)
        raise HTTPException(status_code=400, detail=f"SQL execution failed: {e}")

    rows = _rows_to_dicts(fetched)
    answer = answer_from_rows(question=question, sql=sql, rows=rows, limit=limit)
    return answer, sql, rows

