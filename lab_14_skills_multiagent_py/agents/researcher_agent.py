"""
Research Agent – uses the company_research skill, then enriches with LLM if needed.
Writes companyResearch to graph state.
"""
import json

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from skills.registry import run_skill


class ResearcherAgent:
    def __init__(self, api_key: str) -> None:
        self.model = ChatOpenAI(
            model="openai/gpt-4o-mini",
            temperature=0.3,
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.name = "ResearcherAgent"

    def run(self, state: dict) -> dict:
        plan = state.get("plan") or {}
        company_name = plan.get("companyName") or "Unknown"
        industry_hint = plan.get("industryHint") or ""

        skill_result = run_skill("company_research", {"companyName": company_name, "industryHint": industry_hint})

        system_prompt = (
            "You are a sales researcher. Given structured company research (summary, industry, size, pain points), "
            "add one short paragraph of 'narrative' that a sales person could use when talking to this prospect. "
            "Be concise and professional."
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=json.dumps(skill_result, indent=2)),
        ]
        response = self.model.invoke(messages)
        narrative = response.content if isinstance(response.content, str) else str(response.content)

        company_research = {**skill_result, "narrative": narrative.strip()}
        return {"companyResearch": company_research}

    def get_info(self) -> dict:
        return {"name": self.name, "role": "Company research (skill: company_research) + narrative"}
