/**
 * LangChain agent that uses the MCP calculator server as a tool.
 *
 * Prerequisites:
 *   1. Start the MCP server: npm run start (in the mcp folder)
 *   2. Set OPENAI_API_KEY in .env (or environment)
 *
 * The agent has a tool that calls the calculator via the MCP server's REST endpoint
 * (POST /calculate). You can also connect to the full MCP Streamable HTTP endpoint
 * (POST /mcp) using the MCP SDK Client if you need full MCP protocol.
 */

import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { z } from "zod";

const MCP_CALCULATOR_URL = process.env.MCP_CALCULATOR_URL || "http://127.0.0.1:3100";

// LangChain tool that calls the MCP calculator server (REST endpoint)
const calculatorTool = new DynamicStructuredTool({
  name: "calculate",
  description:
    "Performs a math operation on two numbers. Use for addition, subtraction, multiplication, or division. Call this when the user asks to add, subtract, multiply, or divide two numbers.",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("Operation: add, subtract, multiply, or divide"),
  }),
  func: async ({ a, b, operation }) => {
    const res = await fetch(`${MCP_CALCULATOR_URL}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a, b, operation }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Calculator failed: ${res.status}`);
    }
    const data = await res.json();
    return `Result: ${data.result} (${data.a} ${operation} ${data.b})`;
  },
});

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant with access to a calculator tool.
Use the calculate tool whenever the user asks to add, subtract, multiply, or divide two numbers.
Reply concisely and include the numeric result.`,
  ],
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const agent = await createOpenAIFunctionsAgent({
  llm,
  tools: [calculatorTool],
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools: [calculatorTool],
  verbose: true,
  maxIterations: 5,
});

async function main() {
  console.log("LangChain agent using MCP calculator tool\n");
  console.log("Calculator server URL:", MCP_CALCULATOR_URL);
  console.log("Make sure the MCP server is running: npm run start\n");
  console.log("—".repeat(50));

  const queries = [
    "What is 17 + 25?",
    "Multiply 6 by 7.",
    "What is 100 divided by 4?",
  ];

  for (const query of queries) {
    console.log("\nUser:", query);
    try {
      const result = await agentExecutor.invoke({ input: query });
      console.log("Agent:", result.output);
    } catch (err) {
      console.error("Error:", err.message);
      if (err.cause?.code === "ECONNREFUSED") {
        console.error("Hint: Start the MCP server with: npm run start");
      }
    }
    console.log("—".repeat(50));
  }

  console.log("\nDone.");
}

main().catch(console.error);
