/**
 * Loads the shared knowledge base into Neo4j.
 *
 * (The vector store is in-memory and gets rebuilt at every CLI run, so it
 * doesn't need a separate ingest step — only the graph does.)
 *
 * Run:  npm run ingest
 */
import dotenv from "dotenv";
dotenv.config();
import { triples } from "../data/sentences.js";
import { createGraphStore } from "./graph-store.js";

const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const password = process.env.NEO4J_PASSWORD || "neo4jpassword";

const store = createGraphStore({ uri, user, password });

async function main() {
  console.log(`Connecting to Neo4j at ${uri} ...`);
  await store.run("MATCH (n) DETACH DELETE n");
  console.log("Wiped existing graph.");

  for (const { s, p, o, props = {} } of triples) {
    const cypher = `
      MERGE (a:${s.label} {name: $sName})
      MERGE (b:${o.label} {name: $oName})
      MERGE (a)-[r:${p}]->(b)
      SET r += $props
    `;
    await store.run(cypher, { sName: s.name, oName: o.name, props });
    console.log(`(${s.name})-[:${p}]->(${o.name})`);
  }

  const counts = await store.run(`
    MATCH (n) WITH count(n) AS nodes
    MATCH ()-[r]->() RETURN nodes, count(r) AS edges
  `);
  console.log(`\nDone. Nodes: ${counts[0].nodes}, edges: ${counts[0].edges}`);

  await store.close();
}

main().catch(async (err) => {
  console.error("Ingest failed:", err.message);
  await store.close();
  process.exit(1);
});
