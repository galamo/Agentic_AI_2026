/**
 * Run the QA agent (tool-based) from the command line.
 * Usage (from agent folder):
 *   npm run qa:tools -- "What is the price per m² for tile installation?"
 *   node scripts/run-qa-agent-with-tools.js "How much for bathroom demolition?"
 */

import "dotenv/config";
import { answerWithAgent } from "../agents/qa-agent-with-tools.js";

const question = process.argv.slice(2).join(" ").trim();
if (!question) {
  console.error("Usage: npm run qa:tools -- \"Your question about pricing\"");
  process.exit(1);
}

async function main() {
  console.log("Question:", question);
  console.log("Agent (with search_pricing_reference tool)...\n");
  const reply = await answerWithAgent({ message: question, k: 6, verbose: true });
  console.log("\nAnswer:\n", reply);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
