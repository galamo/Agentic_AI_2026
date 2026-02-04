## Lab 3 – RPG Quest Designer Agent

**Goal**: Build a LangChain Node agent that designs compact, branching RPG quests, powered by OpenRouter.

### Prerequisites

- Node.js 18+
- Root dependencies:
  - `@langchain/openai`
  - `@langchain/core`
  - `dotenv`

Install (if not already):

```bash
npm install
```

Reuse the same `.env` file in the project root:

```bash
OPENROUTER_API_KEY=your-key-here
```

### How it works

- Uses `ChatOpenAI` with the OpenRouter base URL and `openrouter/auto` model.
- System prompt defines a **quest designer** who creates:
  - A quest hook.
  - Locations and NPCs with secrets.
  - A branching outline with meaningful choices.
- The human prompt provides structured hooks about:
  - World, archetype, party, difficulty, playtime, themes.

### Run the example

From the project root:

```bash
npm run lab3
```

Try changing the world, archetype, or themes in `labs/lab3-quest-designer/agent.js` to explore different narrative spaces.

