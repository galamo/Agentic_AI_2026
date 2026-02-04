## Lab 2 – Personal Finance Coach Agent

**Goal**: Build a LangChain Node agent that behaves like a practical personal finance coach, using OpenRouter as the LLM backend.

### Prerequisites

- Node.js 18+
- Dependencies are already installed at the repo root:
  - `@langchain/openai`
  - `@langchain/core`
  - `dotenv`

If needed, install from the root:

```bash
npm install
```

Create or reuse the `.env` file in the project root:

```bash
OPENROUTER_API_KEY=your-key-here
```

### How it works

- Uses `ChatOpenAI` from `@langchain/openai` with:
  - `baseURL` = `https://openrouter.ai/api/v1`
  - `model` = `openrouter/auto`
- The system message defines a **personal finance coach** who:
  - Focuses on budgeting, saving, habits.
  - Avoids legal/tax advice.
- The human prompt collects structured inputs (income, expenses, goals, risk, weaknesses).
- The chain returns:
  - A simple budget breakdown.
  - 3 habit-change suggestions.
  - A short accountability plan.

### Run the example

From the project root:

```bash
npm run lab2
```

To experiment, edit `labs/lab2-finance-coach/agent.js` and tweak the example values passed to `chain.invoke`.

