"""
Researcher Agent – gathers and summarizes information for a given query.
Used as a node in the LangGraph; reads/writes shared state.
"""
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage


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
        """
        Node function: takes graph state, returns partial state update (researchNotes).
        """
        query = state.get("userQuery") or state.get("user_query")
        if not query or not isinstance(query, str):
            return {"research_notes": "No query provided."}

        system_prompt = (
            "You are a research assistant. Given a user question or topic, "
            "produce a short, structured set of research notes (bullets or short paragraphs). "
            "Be factual and concise. Do not make up sources; focus on key points that would "
            "help someone write a clear answer."
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Research and summarize key points for: {query}"),
        ]

        response = self.model.invoke(messages)
        content = response.content
        research_notes = content if isinstance(content, str) else str(content)

        return {"research_notes": research_notes}

    def get_info(self) -> dict:
        return {"name": self.name, "role": "Research and summarize"}
