# Lab 12: LangGraph – LLM Tool-Calling Agent (Option 3)

Single **LLM agent** with two tools. The **model decides** when to call each tool and with what arguments:

1. **fetch_random_users** – Fetches N random users from [Random User API](https://randomuser.me/api/) (1–100).
2. **compute_statistics** – Computes aggregations (by age, location, gender) on the users already fetched.

The orchestrator receives a **natural language message** (e.g. *"Fetch 30 users and give me age and location stats"*). The LLM chooses how many users to fetch, which statistics to compute, and returns a short summary plus the aggregation data.

## Flow

```
userMessage → agent (LLM + tools: fetch_random_users, compute_statistics) → END
```

The agent runs a tool-calling loop: the model may call `fetch_random_users` first, then `compute_statistics`, then respond with a final answer.

## Run

```bash
cp .env.example .env   # set OPENAI_API_KEY (required for the LLM)
npm install
npm start
```

With a custom message:

```bash
node index.js "Get 25 users and show me age and gender breakdown"
node index.js "Fetch 50 random users and compute statistics by location"
```

Default (if no argument): *"Fetch 20 random users and compute statistics by age, location, and gender."*

## Output

- **Final answer** – The LLM’s summary of what it did and the main findings.
- **Aggregation data** (if the agent called `compute_statistics`) – JSON array with e.g. `by_age`, `by_location`, `by_gender`.

## Implementation notes

- **No `langchain/agents`** – The tool loop is implemented manually with `model.bindTools(tools)` and repeated `invoke` until the model stops making tool calls.
- **Shared tool state** – The two tools share a `shared` object so `compute_statistics` uses the users fetched by `fetch_random_users` without the LLM passing a large payload.
