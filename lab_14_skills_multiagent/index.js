/**
 * Lab 14: LangGraph multi-agent + skills – sales proposal pipeline
 *
 * Flow: userQuery → Planner → Researcher (company_research) → Qualifier (lead_qualification) → Writer (proposal_draft)
 * Run: npm start   or   node index.js "Prepare a proposal for Acme Corp in manufacturing"
 * Requires OPENROUTER_API_KEY in .env or environment.
 */
import dotenv from "dotenv";
dotenv.config();
import { createGraph } from "./graph/orchestrator.js";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("MISSING OPENROUTER_API_KEY. Set it in .env or environment.");
  process.exit(1);
}

const { graph, getInfo } = createGraph(apiKey);

console.log("Lab 14 – LangGraph + Skills: Sales proposal pipeline\n");
console.log("Flow:", getInfo().flow);
console.log("Agents:", getInfo().agents.map((a) => a.name).join(" → "));
console.log("");

const userQuery = process.argv[2] || "Prepare a sales proposal for Acme Corp in manufacturing.";

console.log("Query:", userQuery);
console.log("Running graph...\n");

try {
  const initialState = {
    userQuery,
    plan: null,
    companyResearch: null,
    leadQualification: null,
    proposalDraft: null,
  };
  const finalState = await graph.invoke(initialState);

  console.log("--- Plan ---");
  console.log(JSON.stringify(finalState.plan, null, 2));
  console.log("\n--- Company research ---");
  console.log(JSON.stringify(finalState.companyResearch, null, 2));
  console.log("\n--- Lead qualification ---");
  console.log(JSON.stringify(finalState.leadQualification, null, 2));
  console.log("\n--- Proposal draft ---");
  console.log(finalState.proposalDraft || "(none)");
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
