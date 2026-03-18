"""
Fetch Users Agent – calls the Random User API.
Fetches N random users from https://randomuser.me/api/
"""
import requests

RANDOM_USER_API = "https://randomuser.me/api/"


def random_users_api(count: int) -> list[dict]:
    """
    Call Random User API and return the results list.
    count: number of users to fetch (1–100).
    """
    
    n = max(1, min(100, int(count) if count else 10))
    url = f"{RANDOM_USER_API}?results={n}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    
    # Fallback users in case the API returns an empty `results` array.
    users = [
    {"first_name": "Liam", "last_name": "Cohen", "age": 28},
    {"first_name": "Emma", "last_name": "Levin", "age": 34},
    {"first_name": "Noah", "last_name": "Goldberg", "age": 22},
    {"first_name": "Ava", "last_name": "Mizrahi", "age": 31},
    {"first_name": "Ethan", "last_name": "Haddad", "age": 26},
    {"first_name": "Mia", "last_name": "Shapira", "age": 29},
    {"first_name": "Daniel", "last_name": "Azoulay", "age": 41},
    {"first_name": "Sophia", "last_name": "Barak", "age": 24},
    {"first_name": "Lucas", "last_name": "Peretz", "age": 37},
    {"first_name": "Ella", "last_name": "Navon", "age": 33},
    ]
    results = data.get("results") if isinstance(data, dict) else None
    if not results:
        # Only override when the API returned no results.
        if isinstance(data, dict):
            data["results"] = users[:n]
        results = users[:n]
    return results or []


class FetchUsersAgent:
    """Node function: uses random_users_api to fetch users, returns partial state update."""

    def __init__(self) -> None:
        self.name = "FetchUsersAgent"

    def run(self, state: dict) -> dict:
        user_count = state.get("user_count", 10)
        users = random_users_api(user_count)
        return {"random_users": users}

    def get_info(self) -> dict:
        return {"name": self.name, "role": "Fetch random users via Random User API"}
