"""
Weather agent.

Uses Open-Meteo (free, no API key) to fetch forecast data, then summarizes the
user's weather question.

Fallback requirement:
- If the API fails or provides no usable data, always return temperature `30 C`.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

import requests
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field


class WeatherRequest(BaseModel):
    location: str = Field(description="City/region to forecast, e.g. 'Paris, France'")
    date: str | None = Field(
        description="Forecast date as ISO YYYY-MM-DD, or null if the user didn't specify a date."
    )


@dataclass(frozen=True)
class DayForecast:
    date_iso: str
    temp_min_c: float
    temp_max_c: float
    precipitation_sum_mm: float | None

    @property
    def temp_avg_c(self) -> float:
        return (self.temp_min_c + self.temp_max_c) / 2.0


class WeatherAgent:
    def __init__(self, api_key: str) -> None:
        self.model = ChatOpenAI(
            model="openai/gpt-4o-mini",
            temperature=0.2,
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        self.name = "WeatherAgent"
        self.fallback_temperature_c = 30.0

    def _extract_request(self, question: str) -> WeatherRequest:
        today_iso = date.today().isoformat()
        system_prompt = f"""You are extracting weather forecast parameters.

Today's date (for relative words like tomorrow): {today_iso}

Extract:
- location: a city/region mentioned by the user
- date: convert relative dates (today/tomorrow/next week) into ISO YYYY-MM-DD if possible, else null

Return JSON only:
{{"location":"...","date":"YYYY-MM-DD"|null}}
Question:
"""
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=question)]
        try:
            response = self.model.invoke(messages)
            raw = response.content if isinstance(response.content, str) else str(response.content)
            cleaned = re.sub(r"```json?\s*|\s*```", "", raw).strip()
            parsed = json.loads(cleaned)
            return WeatherRequest(**parsed)
        except Exception:
            # Fallback: best-effort heuristics so we don't fail hard.
            iso_dates = re.findall(r"\b(\d{4}-\d{2}-\d{2})\b", question)
            extracted_date = iso_dates[0] if iso_dates else None

            # Very small heuristic for location after "in ...".
            m = re.search(
                r"\bin\s+([A-Za-z][A-Za-z\s,]+?)(?:\b(on|for|around|at|during)\b|[?.!,]|$)",
                question,
                flags=re.IGNORECASE,
            )
            location = m.group(1).strip() if m else "Unknown"
            return WeatherRequest(location=location, date=extracted_date)

    def _geocode(self, location: str) -> tuple[float, float] | None:
        url = "https://geocoding-api.open-meteo.com/v1/search"
        params = {"name": location, "count": 1, "language": "en", "format": "json"}
        try:
            r = requests.get(url, params=params, timeout=10)
            r.raise_for_status()
            data = r.json()
            results = data.get("results") or []
            if not results:
                return None
            first = results[0]
            lat = first.get("latitude")
            lon = first.get("longitude")
            if lat is None or lon is None:
                return None
            return float(lat), float(lon)
        except Exception:
            return None

    def _fetch_daily_forecast(self, lat: float, lon: float, forecast_days: int = 16) -> dict[str, Any] | None:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
            "timezone": "auto",
            "forecast_days": forecast_days,
        }
        try:
            r = requests.get(url, params=params, timeout=10)
            r.raise_for_status()
            return r.json()
        except Exception:
            return None

    def _select_day(self, forecast_json: dict[str, Any], target_date_iso: str) -> DayForecast | None:
        daily = forecast_json.get("daily") or {}
        times: list[str] = daily.get("time") or []
        temp_min: list[float] = daily.get("temperature_2m_min") or []
        temp_max: list[float] = daily.get("temperature_2m_max") or []
        precip: list[float] | None = daily.get("precipitation_sum") or None

        if not times or len(times) != len(temp_min) or len(times) != len(temp_max):
            return None
        if target_date_iso not in times:
            return None

        idx = times.index(target_date_iso)
        tmin = temp_min[idx]
        tmax = temp_max[idx]
        precip_sum = precip[idx] if precip is not None and idx < len(precip) else None
        return DayForecast(
            date_iso=target_date_iso,
            temp_min_c=float(tmin),
            temp_max_c=float(tmax),
            precipitation_sum_mm=float(precip_sum) if precip_sum is not None else None,
        )

    def _fallback(self, location: str, target_date_iso: str) -> dict[str, Any]:
        return {
            "location": location,
            "date": target_date_iso,
            "temperature_c": self.fallback_temperature_c,
            "temperature_min_c": self.fallback_temperature_c,
            "temperature_max_c": self.fallback_temperature_c,
            "precipitation_sum_mm": None,
            "source": "fallback",
        }

    def _summarize(self, question: str, location: str, day: DayForecast | None, fallback_used: bool) -> str:
        if fallback_used or day is None:
            base = f"For {location} around {day.date_iso if day else '(requested date)'}, expect about {self.fallback_temperature_c:.0f} C."
        else:
            base = (
                f"For {location} on {day.date_iso}, expect temperatures around {day.temp_avg_c:.0f} C "
                f"(min {day.temp_min_c:.0f} C / max {day.temp_max_c:.0f} C)."
            )

        # Simple packing heuristic based on the user's phrasing.
        q = question.lower()
        wants_jacket = "jacket" in q or "coat" in q or "warm" in q or "cold" in q or "hoodie" in q
        wants_layers = "layers" in q or "layer" in q
        wants_rain = "rain" in q or "umbrella" in q or "drizzle" in q

        suggestions: list[str] = []
        if day is not None and not fallback_used:
            if wants_jacket:
                if day.temp_avg_c < 12:
                    suggestions.append("Bring a jacket/coat; it looks cool.")
                elif day.temp_avg_c < 20:
                    suggestions.append("Consider light layers (a light jacket).")
                else:
                    suggestions.append("No heavy jacket needed; light clothing should be fine.")
            elif wants_layers or wants_jacket:
                if day.temp_avg_c < 18:
                    suggestions.append("Go with layers so you can adjust to temperature changes.")
            if wants_rain:
                if day.precipitation_sum_mm is not None and day.precipitation_sum_mm > 1.0:
                    suggestions.append("There may be some rain; consider an umbrella or rain jacket.")
                else:
                    suggestions.append("Rain looks limited based on the forecast; an umbrella is optional.")

        if not suggestions:
            # Generic suggestion.
            if day is not None and not fallback_used:
                if day.temp_avg_c >= 25:
                    suggestions.append("If you’re going outdoors, plan for warmer weather (light clothing and water).")
                elif day.temp_avg_c <= 10:
                    suggestions.append("If you’re going outdoors, dress warmer (layers and warm outerwear).")
                else:
                    suggestions.append("Dress in comfortable layers; temperatures look mild.")
            else:
                suggestions.append("Dress for warm-to-mild temperatures based on the fallback estimate.")

        if fallback_used:
            suggestions.append("Note: I used a fallback temperature because the weather API returned no usable data.")

        return base + " " + " ".join(suggestions)

    def run(self, state: dict[str, Any]) -> dict[str, Any]:
        question = state.get("user_question") or ""
        req = self._extract_request(question)

        target_date_iso = req.date or date.today().isoformat()

        # 1) Geocode
        coords = self._geocode(req.location)
        if coords is None:
            weather_result = self._fallback(req.location, target_date_iso)
            return {
                "weather_result": {
                    **weather_result,
                    "summary": self._summarize(question, req.location, None, fallback_used=True),
                }
            }

        lat, lon = coords
        # 2) Fetch daily forecast
        forecast_json = self._fetch_daily_forecast(lat, lon)
        if not forecast_json:
            weather_result = self._fallback(req.location, target_date_iso)
            return {
                "weather_result": {
                    **weather_result,
                    "summary": self._summarize(question, req.location, None, fallback_used=True),
                }
            }

        day = self._select_day(forecast_json, target_date_iso)
        if day is None:
            weather_result = self._fallback(req.location, target_date_iso)
            return {
                "weather_result": {
                    **weather_result,
                    "summary": self._summarize(question, req.location, None, fallback_used=True),
                }
            }

        # 3) Compose
        weather_result = {
            "location": req.location,
            "date": day.date_iso,
            "temperature_c": day.temp_avg_c,
            "temperature_min_c": day.temp_min_c,
            "temperature_max_c": day.temp_max_c,
            "precipitation_sum_mm": day.precipitation_sum_mm,
            "source": "open-meteo",
        }
        summary = self._summarize(question, req.location, day, fallback_used=False)

        return {"weather_result": {**weather_result, "summary": summary}}

    def get_info(self) -> dict[str, Any]:
        return {"name": self.name, "role": "Calls free Open-Meteo weather API and summarizes with fallback"}

