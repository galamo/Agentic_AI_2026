"""
Supervisor / router agent.

Responsibilities:
- Decide which specialized agent(s) should run: vacations, weather, or both.
- Synthesize the final answer from the available specialized results.
"""

from __future__ import annotations

import json
import re
from typing import Any, Literal

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from langchain_core.messages import HumanMessage, SystemMessage


class RouteDecision(BaseModel):
    route: Literal["vacations", "weather", "both"] = Field(
        description='Which tasks to run: "vacations" only, "weather" only, or "both".'
    )


class SupervisorAgent:
    def __init__(self, api_key: str) -> None:
        self.model = ChatOpenAI(
            model="openai/gpt-4o-mini",
            temperature=0.2,
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.name = "SupervisorAgent"

    def route(self, question: str) -> dict[str, Any]:
        system_prompt = """You are a task routing supervisor.
Decide whether the user question requires:
1) vacations: selecting from a local list of vacations (location, dates, prices)
2) weather: calling a free weather API to answer weather-related questions

Output JSON only in this shape:
{"route":"vacations"|"weather"|"both"}
Rules:
- If the user asks about planning trips/vacations, choosing destinations, date options, or pricing: use "vacations".
- If the user asks about temperature, what to pack, rain, or forecasts: use "weather".
- If the user asks something that needs both (e.g., "I want a vacation in X on Y, is it going to be hot?"): use "both".

Question:
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=question),
        ]
        response = self.model.invoke(messages)
        raw = response.content if isinstance(response.content, str) else str(response.content)
        cleaned = re.sub(r"```json?\s*|\s*```", "", raw).strip()

        try:
            parsed = json.loads(cleaned)
            decision = RouteDecision(**parsed)
            return {"route": decision.route}
        except Exception:
            # Safe fallback: treat as vacations if ambiguous.
            q = question.lower()
            if "weather" in q or "rain" in q or "temperature" in q or "pack" in q or "forecast" in q:
                return {"route": "weather"}
            return {"route": "vacations"}

    def synthesize(
        self,
        question: str,
        vacations_result: dict[str, Any] | None,
        weather_result: dict[str, Any] | None,
    ) -> dict[str, Any]:
        vacations_text = json.dumps(vacations_result, indent=2) if vacations_result is not None else "(none)"
        weather_text = json.dumps(weather_result, indent=2) if weather_result is not None else "(none)"

        system_prompt = """You are an assistant that answers the user's question using available tool results.
Write a concise, helpful response.

If both vacations and weather results exist, connect them (e.g., suggest a vacation option and explain the relevant weather/what to pack).
If only one exists, answer using only that information.

Be brief (max ~10 sentences). If you cannot find relevant vacations, say so and ask a follow-up question.
"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=(
                    f"USER QUESTION:\n{question}\n\n"
                    f"VACATIONS RESULT:\n{vacations_text}\n\n"
                    f"WEATHER RESULT:\n{weather_text}\n\n"
                    "Return the final answer as plain text only."
                )
            ),
        ]
        response = self.model.invoke(messages)
        content = response.content if isinstance(response.content, str) else str(response.content)
        return {"final_answer": content.strip()}

    def get_info(self) -> dict[str, Any]:
        return {"name": self.name, "role": "Routes requests to vacations/weather and synthesizes the final answer"}

