"""
Writer Agent – turns research notes into a clear, user-facing answer.
Used as a node in the LangGraph; reads shared state (userQuery, researchNotes), writes finalAnswer.
"""
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# // trigger twice
#  first time when first translator is done
#  second time when second translator is done
def finlize_func(state: dict) -> dict:
    if(state.get("sports_translator_done") and state.get("finance_translator_done")):
        return {"final_answer": state.get("final_answer")}
    else:
        return {"final_answer": "No research available to write from."}
    