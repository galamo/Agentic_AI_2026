import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  model: "mistralai/mistral-7b-instruct", // any OpenRouter model
  temperature: 0.2,

  // IMPORTANT: OpenRouter base URL
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  },
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a friendly travel-planning agent. You design 3-day itineraries that balance sightseeing, food, and local culture. Always ask 2 quick clarifying questions if information is missing.",
  ],
  [
    "human",
    "Plan a 3-day trip.\n\nDeparture city: {departure}\nDestination city: {destination}\nTravel style: {style}\nBudget level: {budget}\nSpecial interests: {interests}",
  ],
]);

const chain = prompt.pipe(model);
export async function runTravelPlanner() {
  console.log("result");
  // if (!process.env.OPENROUTER_API_KEY) {
  // console.error("Missing OPENROUTER_API_KEY in environment.");
  // process.exit(1);
  // }

  const response = await chain.invoke({
    departure: "San Francisco",
    destination: "Tokyo",
    style: "food + culture, light walking",
    budget: "medium",
    interests: "neighborhood cafes, small galleries, hidden viewpoints",
  });
  console.log("result");
  console.log(response.content);
}

// if (import.meta.main) {
runTravelPlanner().catch((err) => {
  console.error(err);
  process.exit(1);
});
// }
