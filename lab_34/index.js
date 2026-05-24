/**
 * Lab 34 — RAG: Vector vs Graph
 *
 * Usage:
 *   node index.js "Your question here"
 *   npm start -- "Your question here"
 *
 * Requires:
 *   - OPENROUTER_API_KEY in .env
 *   - Neo4j running (npm run up) and ingested (npm run ingest)
 */
import dotenv from "dotenv";
dotenv.config();
import { createGraphStore } from "./src/graph-store.js";
import { createRagGraph } from "./src/graph/orchestrator.js";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

const model = process.env.LLM_MODEL || "openai/gpt-4o-mini";
const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const password = process.env.NEO4J_PASSWORD || "neo4jpassword";

const userQuery =
  process.argv.slice(2).join(" ").trim() ||
  "Who does Alice report to and where was her boss previously employed?";

const graphStore = createGraphStore({ uri, user, password });
const { graph } = createRagGraph({ apiKey, model, graphStore });

const hr = (label) => console.log(`\n${"─".repeat(8)} ${label} ${"─".repeat(40 - label.length)}`);

console.log("Lab 34 — RAG: Vector vs Graph");
console.log(`Model:  ${model}`);
console.log(`Neo4j:  ${uri}`);
console.log(`Query:  ${userQuery}`);

try {
  const out = await graph.invoke({ userQuery });

  hr("Vector RAG context (top-k sentences)");
  console.log(out.vectorContext);
  hr("Vector RAG answer");
  console.log(out.vectorAnswer);

  hr("Graph RAG — generated Cypher");
  console.log(out.graphCypher);
  hr("Graph RAG — query result");
  console.log(out.graphContext);
  hr("Graph RAG answer");
  console.log(out.graphAnswer);

  hr("Comparison");
  console.log(out.comparison);
} catch (err) {
  console.error("\nError:", err.message);
  process.exitCode = 1;
} finally {
  await graphStore.close();
}
