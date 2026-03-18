"""
Vacations agent.

Reads local vacation offers from `data/vacations.json` and filters them
based on the user's question (location keywords and optional ISO dates).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


def _parse_iso_date(s: str) -> date | None:
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


def _date_overlaps(v_start: date, v_end: date, q_start: date, q_end: date) -> bool:
    # Overlap inclusive: [a,b] overlaps [c,d] if a<=d and c<=b
    return v_start <= q_end and q_start <= v_end


@dataclass(frozen=True)
class VacationOffer:
    id: str
    location: str
    start_date: date
    end_date: date
    price_usd: float
    highlights: list[str]


class VacationsAgent:
    def __init__(self) -> None:
        lab_root = Path(__file__).resolve().parents[1]
        data_path = lab_root / "data" / "vacations.json"
        raw = json.loads(data_path.read_text(encoding="utf-8"))
        self.offers: list[VacationOffer] = []
        for row in raw:
            start = _parse_iso_date(row["start_date"])
            end = _parse_iso_date(row["end_date"])
            if start is None or end is None:
                continue
            self.offers.append(
                VacationOffer(
                    id=row["id"],
                    location=row["location"],
                    start_date=start,
                    end_date=end,
                    price_usd=float(row["price_usd"]),
                    highlights=list(row.get("highlights") or []),
                )
            )
        self.name = "VacationsAgent"

        # Precompute location tokens for lightweight matching.
        self._city_tokens: list[str] = sorted(
            {o.location.split(",")[0].strip() for o in self.offers if o.location},
            key=lambda x: len(x),
            reverse=True,
        )

    def _extract_location_token(self, question: str) -> str | None:
        q = question.lower()
        for token in self._city_tokens:
            if token.lower() in q:
                return token
        return None

    def _extract_iso_dates(self, question: str) -> list[date]:
        # Looks for YYYY-MM-DD patterns.
        matches = re.findall(r"\b(\d{4}-\d{2}-\d{2})\b", question)
        out: list[date] = []
        for m in matches:
            d = _parse_iso_date(m)
            if d:
                out.append(d)
        return out

    def run(self, state: dict[str, Any]) -> dict[str, Any]:
        question = state.get("user_question") or ""

        location_token = self._extract_location_token(question)
        iso_dates = self._extract_iso_dates(question)

        budget_match = re.search(r"\$\s*(\d+(?:\.\d+)?)", question)
        budget_usd: float | None = float(budget_match.group(1)) if budget_match else None

        filtered: list[VacationOffer] = []
        for offer in self.offers:
            if location_token and location_token.lower() not in offer.location.lower():
                continue

            if budget_usd is not None and offer.price_usd > budget_usd:
                continue

            if len(iso_dates) == 1:
                qd = iso_dates[0]
                if not (offer.start_date <= qd <= offer.end_date):
                    continue
            elif len(iso_dates) >= 2:
                q_start = min(iso_dates[0], iso_dates[1])
                q_end = max(iso_dates[0], iso_dates[1])
                if not _date_overlaps(offer.start_date, offer.end_date, q_start, q_end):
                    continue

            filtered.append(offer)

        filtered.sort(key=lambda o: o.price_usd)
        top = filtered[:5]

        def offer_to_dict(o: VacationOffer) -> dict[str, Any]:
            return {
                "id": o.id,
                "location": o.location,
                "start_date": o.start_date.isoformat(),
                "end_date": o.end_date.isoformat(),
                "price_usd": o.price_usd,
                "highlights": o.highlights,
            }

        vacations_result: dict[str, Any] = {"matches": [offer_to_dict(o) for o in top]}

        if not top:
            vacations_result["summary"] = (
                "No matching vacations found in the local list. "
                "Try asking with one of the available locations (Paris, Athens, Rome, Barcelona, Prague, New York) "
                "and include dates in YYYY-MM-DD format."
            )
            return {"vacations_result": vacations_result}

        best = top[0]
        vacations_result["summary"] = (
            f"Top match: {best.location} ({best.start_date.isoformat()} to {best.end_date.isoformat()}) "
            f"for ${best.price_usd:.0f}. Highlights: {', '.join(best.highlights)}."
        )
        return {"vacations_result": vacations_result}

    def get_info(self) -> dict[str, Any]:
        return {"name": self.name, "role": "Filters local vacation offers from data/vacations.json"}

