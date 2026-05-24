/**
 * Vector RAG: TF-IDF top-k sentences → LLM synthesis.
 */
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { VectorStore } from "../vector-store.js";
import { sentences } from "../../data/sentences.js";

export class VectorRagAgent {
  constructor({ apiKey, model }) {
    this.store = new VectorStore();
    this.store.add(sentences);
    this.llm = new ChatOpenAI({
      modelName: model,
      temperature: 0,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey },
    });
  }

  async run({ userQuery }) {
    const hits = this.store.search(userQuery, 4);
    const context = hits.length
      ? hits.map((h, i) => `[${i + 1}] (score=${h.score.toFixed(3)}) ${h.text}`).join("\n")
      : "(no matches)";

    const system = new SystemMessage(
      "You answer the user's question using ONLY the supplied context sentences. " +
      "If the answer is not present, say so explicitly. Be concise."
    );
    const human = new HumanMessage(
      `Question: ${userQuery}\n\nContext sentences:\n${context}`
    );
    const resp = await this.llm.invoke([system, human]);

    return {
      vectorContext: context,
      vectorAnswer: typeof resp.content === "string" ? resp.content : String(resp.content),
    };
  }
}
