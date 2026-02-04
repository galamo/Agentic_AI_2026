import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  model: "openrouter/auto",
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a practical personal finance coaching agent. You explain trade-offs clearly, avoid giving legal or tax advice, and focus on budgeting, saving, and habits.",
  ],
  [
    "human",
    "Act as a finance coach for this person:\n\nMonthly income (after tax): {income}\nKey expenses: {expenses}\nFinancial goals (6–12 months): {goals}\nRisk tolerance: {risk}\nSpending weaknesses: {weaknesses}\n\n1) Give a simple 50/30/20 style breakdown.\n2) Suggest 3 concrete habit changes.\n3) Propose a one-paragraph accountability plan.",
  ],
]);

const chain = prompt.pipe(model);

export async function runFinanceCoach() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY in environment.");
    process.exit(1);
  }

  const response = await chain.invoke({
    income: "4200 USD",
    expenses:
      "rent 1400, groceries 450, transport 220, subscriptions 90, eating out 350, misc 300",
    goals: "build 3-month emergency fund and pay down credit card debt",
    risk: "low to medium",
    weaknesses: "impulse tech purchases and weekday food delivery",
  });

  console.log(response.content);
}

if (import.meta.main) {
  runFinanceCoach().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

