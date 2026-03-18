"""
Proposal Draft Skill – reusable capability: draft a one-pager proposal.
Used by the Writer Agent. Returns a template structure; the Writer Agent uses the LLM to fill it with personalized content.
"""
name = "proposal_draft"
description = "Produce a proposal structure and sections for a given company using research and qualification."


def run(input_data: dict | None) -> dict:
    input_data = input_data or {}
    company_name = (input_data.get("companyName") or "").strip() or "Valued Client"
    research = input_data.get("research") or {}
    qualification = input_data.get("qualification") or {}

    sections = [
        "Executive summary",
        "Understanding your needs",
        "Recommended solution",
        "Expected outcomes",
        "Next steps",
    ]

    template = "\n".join([
        f"# Proposal: {company_name}",
        "",
        "## Executive summary",
        "[Personalized 2–3 sentences based on research and qualification.]",
        "",
        "## Understanding your needs",
        "[Reference industry, size, and pain points from research.]",
        "",
        "## Recommended solution",
        "[Tailored offering.]",
        "",
        "## Expected outcomes",
        "[Benefits aligned to their situation.]",
        "",
        "## Next steps",
        "[Clear CTA and timeline; consider qualification readiness.]",
    ])

    return {
        "sections": sections,
        "template": template,
        "meta": {
            "company": company_name,
            "qualificationScore": qualification.get("score"),
            "ready": qualification.get("ready"),
        },
    }
