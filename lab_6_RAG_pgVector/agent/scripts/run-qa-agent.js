/**
 * Run the QA agent from the command line (prompt = question as CLI args).
 * Usage (from agent folder):
 *   npm run qa -- "What is the price per m² for tile installation?"
 *   node scripts/run-qa-agent.js "How much for bathroom demolition?"
 */

import "dotenv/config";
import { answer } from "../agents/qa-agent.js";

const question = process.argv.slice(2).join(" ").trim();
if (!question) {
  console.error("Usage: npm run qa -- \"Your question about pricing\"");
  process.exit(1);
}

async function main() {
  console.log("Question:", question);
  console.log("Querying vector DB and generating answer...\n");
  const reply = await answer({ message: question, k: 6 });
  console.log("Answer:\n", reply);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
