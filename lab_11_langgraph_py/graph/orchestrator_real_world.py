"""
Orchestrator: builds a LangGraph where
  START → researcher → writer → END
Agents communicate by reading/writing the shared state.
"""
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from agents.researcher_agent import ResearcherAgent
from agents.writer_agent import WriterAgent
from agents.translator_agent import TranslatorAgent


class State(TypedDict, total=False):
    user_query: str
    research_notes: str | None
    final_answer: str | None
    language: str | None


def create_graph(api_key: str):
    researcher = ResearcherAgent(api_key)
    writer = WriterAgent(api_key)
    translator = TranslatorAgent(api_key)

    def researcher_node(state: State) -> dict:
        return researcher.run(state)

    def writer_node(state: State) -> dict:
        return writer.run(state)

    def translator_node(state: State) -> dict:
        return translator.run(state)

    builder = StateGraph(State)
    builder.add_node("researcher", researcher_node)
    builder.add_node("writer", writer_node)
    builder.add_node("translator", translator_node)
    # Creating Risk Score by User Identifier 

    builder.add_edge(START, "Ideetifyuser") 
    # Fetch user by ID from DB with all the relevant information 
    builder.add_edge("Ideetifyuser", "FinnanceAgent")
    builder.add_edge("Ideetifyuser", "GovermentAgent")
    builder.add_edge("Ideetifyuser", "LawAgent")

    builder.add_edge("FinnanceAgent", "BankAgent")
    builder.add_edge("FinnanceAgent", "InsuranceAgent")

    builder.add_edge("BankAgent", "SummrizeFinnaceAgent")
    builder.add_edge("InsuranceAgent", "SummrizeFinnaceAgent")

     builder.add_edge("GovermentAgent", "MisimAgnet")
     builder.add_edge("GovermentAgent", "HovotAgent")

    builder.add_edge("MisimAgnet", "SummrizeGovermentAgent")
    builder.add_edge("HovotAgent", "SummrizeGovermentAgent")
    
    builder.add_edge("LawAgent", "PoliceAgnet")
    builder.add_edge("LawAgent", "MishpatimAgent")

     builder.add_edge("PoliceAgnet", "SummrizeLawntAgent")
      builder.add_edge("MishpatimAgent", "SummrizeLawntAgent")

      builder.add_edge("SummrizeLawntAgent", "finalAnswer")
      builder.add_edge("SummrizeFinnaceAgent", "finalAnswer")
      builder.add_edge("SummrizeGovermentAgent", "finalAnswer")
    builder.add_edge("finalAnswer", END)

    # def route_after_writer(s: State) -> str:
    #     lang = (s.get("language") or "english").strip().lower()
    #     if lang in {"en", "english", "en_gb", "en-gb"}: 
    #         return "end"
    #     return "translator"
    # builder.add_conditional_edges(
    #     "writer",
    #     route_after_writer,
    #     {
    #         "translator": "translator",
    #         "end": END,
    #     },
    # )
    builder.add_edge("writer", END)
    
    graph = builder.compile()

    def get_info():
        return {
            "agents": [researcher.get_info(), writer.get_info(), translator.get_info()],
            "flow": "user_query → researcher (research_notes) → writer (final_answer) → translator? (final_answer)",
        }

    return {"graph": graph, "get_info": get_info}
