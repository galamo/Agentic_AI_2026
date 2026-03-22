"""
Qualifier Agent – uses the lead_qualification skill.
Reads plan + companyResearch, writes leadQualification to state.
"""
from skills.registry import run_skill
from langgraph.executor import AgentExecutor

executor = AgentExecutor(graph)


class QualifierAgent:
    def __init__(self, _api_key: str | None = None) -> None:
        self.name = "QualifierAgent"

    def run(self, state: dict) -> dict:
        plan = state.get("plan") or {}
        company_research = state.get("companyResearch") or {}
        company_name = plan.get("companyName") or "Unknown"

        lead_qualification = run_skill("lead_qualification", {
            "companyName": company_name,
            "research": company_research,
        })
        return {"leadQualification": lead_qualification}

    def get_info(self) -> dict:
        return {"name": self.name, "role": "Lead qualification (skill: lead_qualification)"}
