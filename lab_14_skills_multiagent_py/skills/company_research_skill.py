"""
Company Research Skill – reusable capability: research a company/industry.
Used by the Research Agent. In production this could call external APIs (Clearbit, LinkedIn, etc.) or RAG over a CRM.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class CompanyResearchSkill:
    """Packaged skill: company + optional industry hint → structured research."""

    name: str = "company_research"
    description: str = (
        "Research a company and its industry; returns summary, size, and typical pain points."
    )

    def run(self, input_data: dict[str, Any] | None) -> dict[str, Any]:
        input_data = input_data or {}
        company_name = (input_data.get("companyName") or "").strip() or "Unknown Company"
        industry_hint = (input_data.get("industryHint") or "").strip()

        return {
            "summary": (
                f"{company_name} is a company"
                f"{f' in the {industry_hint} sector' if industry_hint else ''}. "
                "Research context prepared for qualification and proposal."
            ),
            "industry": industry_hint or "General",
            "size": "Mid-market",
            "painPoints": [
                "Operational efficiency",
                "Scaling processes",
                "Integration with existing tools",
            ],
        }


_skill = CompanyResearchSkill()
name = _skill.name
description = _skill.description
run = _skill.run
