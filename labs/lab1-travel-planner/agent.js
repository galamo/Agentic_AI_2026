import "dotenv/config";
import jwt from "jsonwebtoken";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TavilySearch } from "@langchain/tavily";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
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
    console.log(typeof results)
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

const currencyExchange = tool(({priceInDollar})=>{
  // convert the Price into NIS/ILS 
  // complete the tool to convert the Currency exchange!!! use as part of the user prompt the new tool
  // change system prompt, user prompt 
}, {
  name: "currency_exchange",
  description: "what is the description? ",
  schema: z.object({
    priceInDollar: z.string().describe("Price in Dollar"),
  })
})

const FLIGHT_SYSTEM_PROMPT = `You are a friendly travel-planning agent with access to a flight finder tool.

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

IMPORTANT: Always format flight results as JSON.
Include any additional itinerary or travel advice in plain text after the JSON block.`;

// Create ReAct agent with web and flight tools
const agent = createReactAgent({
  llm: model,
  tools: [flightFinder],
  prompt: FLIGHT_SYSTEM_PROMPT,
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
  const userInput =
    "Plan a 3-day trip from Tel Aviv to New-York. Style: food + culture, light walking. Budget: high. Interests: sails at rivers, small galleries, hidden viewpoints. Use the flight finder to check flights.";

  const result = await agent.invoke({
    messages: [
      // { role: "system", content: "RETURN A JSON STRUCTURE FROM THE LIST FLIGHTS" },
      { role: "user", content: userInput }],
  });
  // locked?
  // Get the final AI response from messages
  const lastMessage = result.messages[result.messages.length - 1];
  return lastMessage.content
}

runTravelPlanner().then((message)=>{
  console.log("#######HIS IS AI RESULT########")
  console.log(message)
  console.log("#######HIS IS AI RESULT########")
}).catch((err) => {
    console.error(err);
    process.exit(1);
 });


 for (let index = 0; index < 50; index++) {
  console.log("Do something...")
 }