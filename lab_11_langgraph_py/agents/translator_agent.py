"""
Translator Agent – translates the writer's final answer when needed.

Reads shared state (final_answer, language) and writes final_answer (translated).
If language is English, it returns the original final_answer unchanged.
"""

from __future__ import annotations

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage


class TranslatorAgent:
    def __init__(self, api_key: str) -> None:
        self.model = ChatOpenAI(
            model="openai/gpt-4o-mini",
            temperature=0.3,
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.name = "TranslatorAgent"

    def run(self, state: dict) -> dict:
        final_answer = (
            state.get("final_answer")
            or state.get("finalAnswer")
            or state.get("final_result")
            or state.get("finalResult")
        )
        language = state.get("language") or state.get("lang") or "english"

        if not final_answer or not isinstance(final_answer, str):
            return {"final_answer": final_answer}

        lang_norm = str(language).strip().lower()
        if lang_norm in {"en", "english", "en-us", "en_gb", "en-gb"}:
            # English: no translation needed.
            return {"final_answer": final_answer}

        system_prompt = (
            "You are a professional translator. Translate the provided text into the "
            "requested language. Preserve the original meaning and tone. "
            "Return only the translated text (no quotes, no extra commentary)."
        )
        user_prompt = f"Requested language: {language}\n\nText:\n{final_answer}"

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = self.model.invoke(messages)
        translated = response.content if isinstance(response.content, str) else str(response.content)
        return {"final_answer": translated}

    def get_info(self) -> dict:
        return {"name": self.name, "role": "Translate final answer by language"}

