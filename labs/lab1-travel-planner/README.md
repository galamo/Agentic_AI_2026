## Lab 1 – Travel Planner Agent

**Goal**: Build a simple LangChain Node agent that designs a 3-day travel itinerary, powered by OpenRouter as the LLM backend.

### Prerequisites

- Node.js 18+ (for native `fetch` and ES modules)
- Dependencies installed at the repo root:
  - `@langchain/openai`
  - `@langchain/core`
  - `dotenv`

Install (already done if you ran it once at the root):

```bash
npm install
```

Create a `.env` file in the project root:

```bash
OPENROUTER_API_KEY=your-key-here
```

### How it works

- Uses `ChatOpenAI` from `@langchain/openai` with:
  - `baseURL` set to `https://openrouter.ai/api/v1`
  - `model` set to `openrouter/auto`
- Composes a `ChatPromptTemplate` with:
  - A system message describing the travel-planning behavior.
  - A human message with slots for departure, destination, style, budget, and interests.
- Invokes the chain with example values and prints the full itinerary.

### Run the example

From the project root:

```bash
npm run lab1
```

To customize, edit `labs/lab1-travel-planner/agent.js` and change the values passed into `chain.invoke`.

