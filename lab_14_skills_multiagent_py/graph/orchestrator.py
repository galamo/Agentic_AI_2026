"""
Orchestrator: LangGraph controls workflow; each agent may use skills for capabilities.
Shared state: userQuery → planner → researcher (company_research) → qualifier (lead_qualification) → writer (proposal_draft).
"""
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from agents.planner_agent import PlannerAgent
from agents.qualifier_agent import QualifierAgent
from agents.researcher_agent import ResearcherAgent
from agents.writer_agent import WriterAgent


class State(TypedDict, total=False):
    userQuery: str
    plan: dict | None
    companyResearch: dict | None
    leadQualification: dict | None
    proposalDraft: str | None


def create_graph(api_key: str) -> dict:
    planner = PlannerAgent(api_key)
    researcher = ResearcherAgent(api_key)
    qualifier = QualifierAgent(api_key)
    writer = WriterAgent(api_key)

    builder = StateGraph(State)
    builder.add_node("planner", lambda state: planner.run(state))
    builder.add_node("researcher", lambda state: researcher.run(state))
    builder.add_node("qualifier", lambda state: qualifier.run(state))
    builder.add_node("writer", lambda state: writer.run(state))
    builder.add_edge(START, "planner")
    builder.add_edge("planner", "researcher")
    builder.add_edge("researcher", "qualifier")
    builder.add_edge("qualifier", "writer")
    builder.add_edge("writer", END)
    graph = builder.compile()

    def get_info() -> dict:
        return {
            "flow": "userQuery → planner → researcher (company_research) → qualifier (lead_qualification) → writer (proposal_draft)",
            "agents": [planner.get_info(), researcher.get_info(), qualifier.get_info(), writer.get_info()],
        }

    return {"graph": graph, "get_info": get_info}
