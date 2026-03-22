"""
Planner Agent – interprets the user request and produces a structured plan.
No skills; sets company name and industry hint for downstream agents/skills.
"""
import json
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


SYSTEM_PROMPT = """You are a sales operations planner. Given a user request about preparing a proposal or researching a lead, extract:
1. companyName: the company name (or "Unknown" if not given)
2. industryHint: industry or sector if mentioned (e.g. manufacturing, healthcare, tech)
3. steps: a short list of steps we will take, e.g. ["company_research", "lead_qualification", "proposal_draft"]

Reply in this exact JSON only, no other text:
{"companyName":"...","industryHint":"...","steps":["company_research","lead_qualification","proposal_draft"]}"""


class PlannerAgent:
    def __init__(self, api_key: str) -> None:
        self.model = ChatOpenAI(
            model="openai/gpt-4o-mini",
            temperature=0.2,
            base_url="https://openrouter.ai/api/fv1",
            api_key=api_key,
        )
        self.name = "PlannerAgent"

    def run(self, state: dict) -> dict:
        query = state.get("userQuery") or ""
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=query or "Prepare a sales proposal for a company."),
        ]
        response = self.model.invoke(messages)
        raw = response.content if isinstance(response.content, str) else str(response.content)
        plan = {
            "companyName": "Unknown",
            "industryHint": "",
            "steps": ["company_research", "lead_qualification", "proposal_draft"],
        }
        try:
            cleaned = re.sub(r"```json?\s*|\s*```", "", raw).strip()
            parsed = json.loads(cleaned)
            plan = {**plan, **parsed}
        except (json.JSONDecodeError, TypeError):
            pass
        return {"plan": plan}

    def get_info(self) -> dict:
        return {"name": self.name, "role": "Parse request and produce plan (company, industry, steps)"}
