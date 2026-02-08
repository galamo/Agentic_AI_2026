import "dotenv/config";
import jwt from "jsonwebtoken";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TavilySearch } from "@langchain/tavily";
import { createAgent } from "langchain";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// calude, sonet , gemini ? 
const model = new ChatOpenAI({
  model: "openai/gpt-4o-mini", // OpenRouter model with tool calling support
  temperature: 0.2,
  
  // streaming:true,
  // IMPORTANT: OpenRouter base URL
  configuration: {
    baseURL: "https://openrouter.ai/api/v1", // antropic / google / openai ... 
    apiKey: process.env.OPENROUTER_API_KEY,
    
  },
});

// Web search tool – access to the web for travel info, hotels, destinations, etc.
const webSearch = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

// Flight finder tool – searches for flights using web search
const flightFinder = tool(
  async ({ origin, destination, date }) => {
    const query = date
      ? `flights from ${origin} to ${destination} on ${date}`
      : `flights from ${origin} to ${destination}`;
    const results = await webSearch.invoke({ query });
    console.log(JSON.stringify(results)) // print in dollar all the text!!!!!
    return typeof results === "string" ? results : JSON.stringify(results);
  },
  {
    name: "flight_finder",
    description:
      "Search for flight options between cities. Use this to find available flights, prices, and airlines when planning travel.",
    schema: z.object({
      origin: z.string().describe("Departure city or airport (e.g. San Francisco)"),
      destination: z.string().describe("Arrival city or airport (e.g. Tokyo)"),
      date: z
        .string()
        .optional()
        .describe("Travel date (e.g. 2025-03-15) – optional"),
    }),
  }
);

const currencyExchange = tool(({ priceInDollar }) => {
  // replace? parseInt
  const price = parseFloat(priceInDollar);
  if (isNaN(price)) return "Invalid price. Please provide a numeric value in USD.";
  const priceInNIS = Math.round(price * 3.2);
  return `${price} USD = ${priceInNIS} NIS/ILS`;
}, {
  name: "currency_exchange",
  description: "Convert a price from US Dollars (USD) to Israeli New Shekel (NIS/ILS). Use this when the user asks for prices in NIS, shekels, or ILS, or when showing flight/hotel prices to someone who prefers Israeli currency. Exchange rate: 1 USD ≈ 3.2 NIS.",
  schema: z.object({
    priceInDollar: z.string().describe("Price in US Dollars to convert to NIS/ILS"),
  }),
});

// tool exchange to all currnecies ( MCP/openapi sepcification)


const FLIGHT_SYSTEM_PROMPT = `You are a friendly travel-planning agent with access to a flight finder tool

TOOLS:
- flight_finder: Search for flights between cities. Use this to find flights, prices, and airlines.
- currency_exchange: Convert USD prices to NIS/ILS. Use this when the user asks for prices in shekels.

When you suggest flights, return each flight suggestion as valid JSON with this structure:
{
  "flights": [
    {
      "airline": "string", 
      "departure": "string",  
      "arrival": "string", 
      "price": "string", 
      "duration": "string", 
      "stops": "string" 
    }
  ]
}

IMPORTANT: 
- Always format flight results as JSON.
- When showing prices to a user who prefers NIS/ILS, use the currency_exchange tool to convert USD prices to shekels ONLY IF THE USER ASK FOR IT.
- Include any additional itinerary or travel advice in plain text after the JSON block.`;

// Create ReAct agent with web and flight tools (createAgent is the replacement for deprecated createReactAgent)
const agent = createAgent({
  model,
  tools: [flightFinder, currencyExchange],
  systemPrompt: FLIGHT_SYSTEM_PROMPT,
});


export async function runTravelPlanner() {

  // API keys validation
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY in environment.");
    // process.exit(1);
  }

  if (!process.env.TAVILY_API_KEY) {
    console.error(
      "Missing TAVILY_API_KEY. Get one at https://app.tavily.com and add to .env"
    );
    // process.exit(1);
  }

  // interact with client ? 
  const userInput = `Plan a 3-day trip from Tel Aviv to New-York. Style: food + culture, light walking. Budget: high. Interests: sails at rivers, small galleries, hidden viewpoints. Use the flight finder to check flights, show me prices in NIS/ILS`;

  const result = await agent.invoke({
    messages: [
      // { role: "system", content: "RETURN A JSON STRUCTURE FROM THE LIST FLIGHTS" },
      { role: "user", content: userInput }],
  });

  // Print agent execution trace: reasoning and tool usage
  console.log("\n========== AGENT EXECUTION TRACE (reasoning + tools) ==========\n");
  let step = 0;
  for (const msg of result.messages) {
    const role = (msg._getType?.() ?? msg.constructor?.name ?? "Message").toLowerCase();
    if (role.includes("human")) continue; // skip user message

    if (role.includes("ai")) {
      step += 1;
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      if (content && content !== "[]" && content !== "{}") {
        console.log(`--- Step ${step} [AI reasoning] ---`);
        console.log(content.slice(0, 1500) + (content.length > 1500 ? "\n... (truncated)" : ""));
        console.log("");
      }
      const toolCalls = msg.tool_calls ?? msg.additional_kwargs?.tool_calls ?? [];
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        console.log(`--- Step ${step} [Tools called] ---`);
        for (const tc of toolCalls) {
          const name = tc.name ?? tc.function?.name ?? "unknown";
          let args = tc.args;
          if (args === undefined && tc.function?.arguments) {
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              args = tc.function.arguments;
            }
          }
          console.log(`  • ${name}`, args ?? {});
        }
        console.log("");
      }
    }

    if (role.includes("tool")) {
      const name = msg.name ?? "tool";
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      const preview = content.length > 400 ? content.slice(0, 400) + "..." : content;
      console.log(`--- Tool result [${name}] ---`);
      console.log(preview);
      console.log("");
    }
  }
  console.log("========== END AGENT TRACE ==========\n");

  // Get the final AI response from messages
  const lastMessage = result.messages[result.messages.length - 1];
  return lastMessage.content;
}

// Export agent for use by server.js
export { agent };

// Run standalone when executed directly (e.g. node agent_new.js)
const isMain = process.argv[1]?.endsWith("agent_new.js");
if (isMain) {
  runTravelPlanner()
    .then((message) => {
      console.log("#######HIS IS AI RESULT########");
      console.log(message);
      console.log("#######HIS IS AI RESULT########");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

