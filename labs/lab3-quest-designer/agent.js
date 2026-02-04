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
    "You are a creative quest designer for story-driven RPGs. You write short, playable quests with interesting choices, NPCs, and rewards. Keep the tone cinematic but concise.",
  ],
  [
    "human",
    "Design a compact RPG quest.\n\nGame world: {world}\nPlayer archetype: {archetype}\nParty composition: {party}\nDifficulty: {difficulty}\nDesired playtime: {playtime}\nKey themes: {themes}\n\nReturn:\n1) A 3-sentence quest hook.\n2) 3 key locations.\n3) 3 important NPCs (with secrets).\n4) A branching outline with at least 2 major choices.",
  ],
]);

const chain = prompt.pipe(model);

export async function runQuestDesigner() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Missing OPENROUTER_API_KEY in environment.");
    process.exit(1);
  }

  const response = await chain.invoke({
    world: "solarpunk archipelago of floating islands",
    archetype: "reluctant engineer-hero",
    party: "tinkerer, ex-pirate navigator, idealistic botanist-mage",
    difficulty: "medium",
    playtime: "one evening session (2–3 hours)",
    themes: "hopeful technology, found family, moral gray areas",
  });

  console.log(response.content);
}

if (import.meta.main) {
  runQuestDesigner().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

