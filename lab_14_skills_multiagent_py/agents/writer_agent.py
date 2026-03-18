"""
Writer Agent – uses the proposal_draft skill for structure, then LLM to fill a personalized proposal.
Reads plan, companyResearch, leadQualification; writes proposalDraft to state.
"""
import json

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from skills.registry import run_skill


class WriterAgent:
    def __init__(self, api_key: str) -> None:
        self.model = ChatOpenAI(
            model="openai/gpt-4o-mini",
            temperature=0.5,
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.name = "WriterAgent"

    def run(self, state: dict) -> dict:
        plan = state.get("plan") or {}
        company_research = state.get("companyResearch") or {}
        lead_qualification = state.get("leadQualification") or {}
        company_name = plan.get("companyName") or "Valued Client"

        skill_result = run_skill("proposal_draft", {
            "companyName": company_name,
            "research": company_research,
            "qualification": lead_qualification,
        })
        template = skill_result.get("template", "")
        sections = skill_result.get("sections", [])

        system_prompt = (
            "You are a sales writer. Using the proposal template and sections, write a complete, professional "
            "one-pager proposal. Use the company research (summary, industry, pain points, narrative) and lead "
            "qualification (score, readiness) to personalize the content. Output the full proposal as markdown."
        )
        user_prompt = (
            f"Template and sections:\n{template}\n\n"
            f"Company research:\n{json.dumps(company_research, indent=2)}\n\n"
            f"Qualification:\n{json.dumps(lead_qualification, indent=2)}\n\n"
            "Write the final proposal."
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        response = self.model.invoke(messages)
        proposal_draft = response.content if isinstance(response.content, str) else str(response.content)

        return {"proposalDraft": proposal_draft}

    def get_info(self) -> dict:
        return {"name": self.name, "role": "Proposal draft (skill: proposal_draft) + LLM personalization"}
