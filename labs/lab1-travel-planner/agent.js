import "dotenv/config";
import jwt from "jsonwebtoken";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TavilySearch } from "@langchain/tavily";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatOpenAI({
  model: "openai/gpt-4o-mini", // OpenRouter model with tool calling support
  temperature: 0.2,

  // IMPORTANT: OpenRouter base URL
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
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

Always format flight results as JSON. Include any additional itinerary or travel advice in plain text after the JSON block.`;

// Create ReAct agent with web and flight tools
const agent = createReactAgent({
  llm: model,
  tools: [flightFinder],
  prompt: FLIGHT_SYSTEM_PROMPT,
});

// const prompt = ChatPromptTemplate.fromMessages([
//   [
//     "system",
//     "You are a friendly travel-planning agent. You design 3-day itineraries that balance sightseeing, food, and local culture. Always ask 2 quick clarifying questions if information is missing. You have access to web search and flight finder tools – use them to look up real flights, hotel info, attractions, and current travel details when helpful.",
//   ],
//   [
//     "human",
//     "Plan a 3-day trip.\n\nDeparture city: {departure}\nDestination city: {destination}\nTravel style: {style}\nBudget level: {budget}\nSpecial interests: {interests}",
//   ],
// ]);

// const chain = prompt.pipe(model);

export async function runTravelPlanner() {
  console.log("111111")
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY in environment.");
    // process.exit(1);
  }
  console.log("111111")

  if (!process.env.TAVILY_API_KEY) {
    console.error(
      "Missing TAVILY_API_KEY. Get one at https://app.tavily.com and add to .env"
    );
  console.log("111111")

    // process.exit(1);
  }

  const userInput =
    "Plan a 3-day trip from San Francisco to Tokyo. Style: food + culture, light walking. Budget: medium. Interests: neighborhood cafes, small galleries, hidden viewpoints. Use the flight finder to check flights.";

  const result = await agent.invoke({
    messages: [
      // { role: "system", content: "RETURN A JSON STRUCTURE FROM THE LIST FLIGHTS" },
      { role: "user", content: userInput }],
  });

  // Get the final AI response from messages
  const lastMessage = result.messages[result.messages.length - 1];
  console.log(lastMessage.content);
}
console.log("star")
// if (import.meta.main) {
  runTravelPlanner().catch((err) => {

    console.error(err);
    process.exit(1);
  });
// }
