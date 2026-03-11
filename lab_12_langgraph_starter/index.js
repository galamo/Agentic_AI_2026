/**
 * Lab 12: LangGraph – LLM tool-calling agent (Option 3)
 *
 * Single agent with tools: fetch_random_users, compute_statistics.
 * The model decides when to call each tool and with what arguments.
 *
 * Run: npm start   or   node index.js ["your natural language request"]
 * Example: node index.js "Get 25 users and show me age and gender breakdown"
 * Default: "Fetch 20 random users and compute statistics by age, location, and gender."
 *
 * Requires OPENAI_API_KEY in .env.
 */
import "dotenv/config";
import { createGraph } from "./graph/orchestrator.js";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

const userMessageArg = process.argv[2];
const userMessage =
  userMessageArg && userMessageArg.trim()
    ? userMessageArg.trim()
    : "Fetch 20 random users and compute statistics by age, location, and gender.";

const { graph, getInfo } = await createGraph(apiKey);

console.log("Lab 12 – LangGraph: LLM tool-calling agent\n");
console.log("Flow:", getInfo().flow);
console.log("Agent:", getInfo().agents.map((a) => a.name).join(", "));
console.log("");
console.log("Request:", userMessage);
console.log("Running graph...\n");

try {
  const initialState = {
    userMessage,
    finalAnswer: null,
    randomUsers: null,
    aggregations: null,
  };
  const finalState = await graph.invoke(initialState);

  console.log("--- Final answer ---");
  console.log(finalState.finalAnswer ?? "(no response)");
  if (finalState.aggregations?.length) {
    console.log("\n--- Aggregation data (from tools) ---");
    console.log(JSON.stringify(finalState.aggregations, null, 2));
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
