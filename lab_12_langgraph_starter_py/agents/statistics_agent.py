"""
Statistics Agent – receives random users and requested statistic types,
computes aggregations (by age, location, gender) and returns a list of dicts.
"""
from typing import Any


class StatisticsAgent:
    def __init__(self) -> None:
        self.name = "StatisticsAgent"

    def compute_aggregations(
        self, users: list[dict], requested: list[str]
    ) -> list[dict[str, Any]]:
        if not users:
            return [{"type": "error", "message": "No users to aggregate"}]

        aggregations: list[dict[str, Any]] = []
        lower = [str(s).lower() for s in (requested or [])]

        if "age" in lower:
            by_age: dict[int, int] = {}
            for u in users:
                age = u.get("dob", {}).get("age", 0) or 0
                by_age[age] = by_age.get(age, 0) + 1
            buckets = {"0-17": 0, "18-30": 0, "31-45": 0, "46-60": 0, "61+": 0}
            for age_str, count in by_age.items():
                age = int(age_str)
                if age <= 17:
                    buckets["0-17"] += count
                elif age <= 30:
                    buckets["18-30"] += count
                elif age <= 45:
                    buckets["31-45"] += count
                elif age <= 60:
                    buckets["46-60"] += count
                else:
                    buckets["61+"] += count
            aggregations.append({"type": "by_age", "buckets": buckets, "total": len(users)})

        if "location" in lower:
            by_country: dict[str, int] = {}
            by_state: dict[str, int] = {}
            for u in users:
                loc = u.get("location") or {}
                country = loc.get("country", "Unknown")
                state = loc.get("state", "Unknown")
                by_country[country] = by_country.get(country, 0) + 1
                by_state[state] = by_state.get(state, 0) + 1
            aggregations.append({
                "type": "by_location",
                "by_country": by_country,
                "by_state": by_state,
                "total": len(users),
            })

        if "gender" in lower:
            by_gender: dict[str, int] = {}
            for u in users:
                g = u.get("gender", "unknown")
                by_gender[g] = by_gender.get(g, 0) + 1
            aggregations.append({"type": "by_gender", "by_gender": by_gender, "total": len(users)})

        if not aggregations:
            aggregations.append({
                "type": "info",
                "message": "No statistic types requested; add age, location, or gender.",
            })

        return aggregations

    def run(self, state: dict) -> dict:
        users = state.get("random_users") or []
        requested = state.get("statistics_requested") or ["age", "location"]
        aggregations = self.compute_aggregations(users, requested)
        return {"aggregations": aggregations}

    def get_info(self) -> dict:
        return {
            "name": self.name,
            "role": "Compute statistics (by age, location, gender) from random users",
        }
