"""
Lab 11: Two agents communicating via LangGraph (Python)

Flow: user_query → ResearcherAgent (research_notes) → WriterAgent (final_answer)

Run: python main.py [optional question] [optional language]
Requires OPENROUTER_API_KEY in .env or environment.

The compiled graph is run inside a LangChain AgentExecutor: a tool-calling agent
invokes a tool that calls graph.invoke(...).
"""
import os
import sys

from dotenv import load_dotenv
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent, tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()

from graph.orchestrator import create_graph

api_key = os.environ.get("OPENROUTER_API_KEY")
if not api_key:
    print("MISSING API KEY. Set OPENROUTER_API_KEY in .env or environment.", file=sys.stderr)
    sys.exit(1)

result = create_graph(api_key)
graph = result["graph"]
get_info = result["get_info"]

# Filled by the graph tool so we can print the same structured output as before.
_last_graph_state: dict = {}


def _make_graph_tool(compiled_graph):
    @tool
    def run_research_writer_pipeline(user_query: str, language: str = "english") -> str:
        """Run the LangGraph: researcher → writer → optional translator.

        Args:
            user_query: The user's question or topic.
            language: Target language for the final answer (e.g. english, french).

        Returns:
            A short confirmation; full notes and answer are printed from graph state.
        """
        final_state = compiled_graph.invoke(
            {
                "user_query": user_query,
                "research_notes": None,
                "final_answer": None,
                "language": language,
            }
        )
        _last_graph_state.clear()
        _last_graph_state.update(final_state)
        return "Pipeline finished successfully."

    return run_research_writer_pipeline


graph_tool = _make_graph_tool(graph)

llm = ChatOpenAI(
    model="openai/gpt-4o-mini",
    temperature=0,
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
)

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You run the research–writer workflow. For each user message, call "
            "`run_research_writer_pipeline` exactly once with `user_query` set to their question "
            "and `language` to the requested output language (default english). "
            "Then give a one-sentence confirmation.",
        ),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ]
)

agent = create_tool_calling_agent(llm, [graph_tool], prompt)
executor = AgentExecutor(
    agent=agent,
    tools=[graph_tool],
    verbose=True,
    max_iterations=5,
)

print("Lab 11 – LangGraph (Python): Researcher ↔ Writer\n")
print("Flow:", get_info()["flow"])
print("Agents:", " → ".join(a["name"] for a in get_info()["agents"]))
print()

user_query = sys.argv[1] if len(sys.argv) > 1 else "What are the main benefits of renewable energy?"
language = sys.argv[2] if len(sys.argv) > 2 else "english"

print("Query:", user_query)
print("Language:", language)
print("Running graph via AgentExecutor...\n")

try:
    executor.invoke(
        {
            "input": f"user_query: {user_query}\nlanguage: {language}",
        }
    )
    print("\n--- Research notes ---")
    print(_last_graph_state.get("research_notes") or "(none)")
    print("\n--- Final answer ---")
    print(_last_graph_state.get("final_answer") or "(none)")
except Exception as e:
    print("Error:", e, file=sys.stderr)
    sys.exit(1)
