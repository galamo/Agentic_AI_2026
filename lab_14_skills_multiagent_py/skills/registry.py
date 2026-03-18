"""
Skills registry – reusable capabilities used by agents.
LangGraph orchestrates flow; skills provide the abilities.
"""
from . import company_research_skill, lead_qualification_skill, proposal_draft_skill

_skills = {
    company_research_skill.name: company_research_skill,
    lead_qualification_skill.name: lead_qualification_skill,
    proposal_draft_skill.name: proposal_draft_skill,
}


def run_skill(skill_name: str, input_data: dict) -> dict:
    skill = _skills.get(skill_name)
    if not skill or not callable(getattr(skill, "run", None)):
        raise ValueError(f"Unknown or invalid skill: {skill_name}")
    return skill.run(input_data)
