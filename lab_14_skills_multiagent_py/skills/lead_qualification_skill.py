"""
Lead Qualification Skill – reusable capability: BANT-style qualification.
Used by the Qualifier Agent. In production this could use CRM fields, call scoring APIs, or an LLM to infer from notes.
"""
name = "lead_qualification"
description = "Score a lead using BANT (Budget, Authority, Need, Timeline); returns score and readiness."


def run(input_data: dict | None) -> dict:
    input_data = input_data or {}
    company_name = (input_data.get("companyName") or "").strip() or "Unknown"
    _research = input_data.get("research") or {}

    bant = {
        "budget": {"score": 7, "note": "Budget signals positive; mid-market typically has allocated spend."},
        "authority": {"score": 6, "note": "Decision-maker engagement to be confirmed."},
        "need": {"score": 8, "note": "Pain points align with our solution."},
        "timeline": {"score": 7, "note": "Quarterly initiative; follow-up within 2 weeks."},
    }
    total = sum(v.get("score", 0) for v in bant.values())
    max_score = 4 * 10
    score = round((total / max_score) * 100)
    ready = score >= 60

    return {
        "score": score,
        "bant": bant,
        "ready": ready,
        "reasoning": f"{company_name} qualifies as {'sales-ready' if ready else 'nurture'}. Overall score {score}/100.",
    }
