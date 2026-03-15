"""
Writer Agent – turns research notes into a clear, user-facing answer.
Used as a node in the LangGraph; reads shared state (userQuery, researchNotes), writes finalAnswer.
"""
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage


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
        """
        Node function: takes graph state, returns partial state update (final_answer).
        """
        user_query = state.get("userQuery") or state.get("user_query")
        research_notes = state.get("research_notes") or state.get("researchNotes")
        if not research_notes:
            return {"final_answer": "No research available to write from."}

        system_prompt = (
            "You are a writer. Using the research notes provided, write a clear, friendly, "
            "and concise answer to the user's question. Do not add made-up facts; stick to "
            "the research. Use plain language."
        )
        user_prompt = (
            f"User question: {user_query or 'N/A'}\n\n"
            f"Research notes:\n{research_notes}\n\n"
            "Write the final answer for the user."
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = self.model.invoke(messages)
        content = response.content
        final_answer = content if isinstance(content, str) else str(content)

        return {"final_answer": final_answer}

    def get_info(self) -> dict:
        return {"name": self.name, "role": "Turn research into a clear answer"}
