/**
 * Lab 11: Two agents communicating via LangGraph
 *
 * Flow: userQuery → ResearcherAgent (writes researchNotes) → WriterAgent (writes finalAnswer)
 * Run: npm start   or   node index.js
 * Requires OPENAI_API_KEY in .env or environment.
 */
import "dotenv/config";
import { createGraph } from "./graph/orchestrator.js";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY in .env or environment.");
  process.exit(1);
}

const { graph, getInfo } = createGraph(apiKey);

console.log("Lab 11 – LangGraph: Researcher ↔ Writer\n");
console.log("Flow:", getInfo().flow);
console.log("Agents:", getInfo().agents.map((a) => a.name).join(" → "));
console.log("");

const userQuery = process.argv[2] || "What are the main benefits of renewable energy?";

console.log("Query:", userQuery);
console.log("Running graph...\n");

try {
  const initialState = { userQuery, researchNotes: null, finalAnswer: null };
  const finalState = await graph.invoke(initialState);

  console.log("--- Research notes ---");
  console.log(finalState.researchNotes || "(none)");
  console.log("\n--- Final answer ---");
  console.log(finalState.finalAnswer || "(none)");
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
