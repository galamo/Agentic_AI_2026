/**
 * Graph RAG: LLM drafts a Cypher query against a known schema, we execute it
 * against Neo4j, then the LLM synthesises an answer from the rows returned.
 *
 * This is the "text-to-Cypher" pattern. The schema description below is what
 * gives the LLM enough grounding to produce valid queries.
 */
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const SCHEMA = `
Node labels and properties:
  (:Person {name})
  (:Company {name})
  (:City {name})
  (:Country {name})

Relationship types (direction matters):
  (:Person)-[:WORKS_AT {role}]->(:Company)
  (:Person)-[:WORKED_AT {role, past}]->(:Company)
  (:Person)-[:CTO_OF]->(:Company)
  (:Person)-[:REPORTS_TO]->(:Person)
  (:Person)-[:FOUNDED {year}]->(:Company)
  (:Person)-[:COLLABORATES_WITH]->(:Person)
  (:Company)-[:ACQUIRED {year}]->(:Company)
  (:Company)-[:HEADQUARTERED_IN]->(:City)
  (:Company)-[:BASED_IN]->(:City)
  (:Company)-[:PARTNERS_WITH]->(:Company)
  (:City)-[:CAPITAL_OF]->(:Country)
  (:City)-[:LOCATED_IN]->(:Country)
`.trim();

export class GraphRagAgent {
  constructor({ apiKey, model, graphStore }) {
    this.graph = graphStore;
    this.llm = new ChatOpenAI({
      modelName: model,
      temperature: 0,
      configuration: { baseURL: "https://openrouter.ai/api/v1", apiKey },
    });
  }

  async run({ userQuery }) {
    const cypher = await this._writeCypher(userQuery);
    let rows = [];
    let cypherError = null;
    try {
      rows = await this.graph.run(cypher);
    } catch (err) {
      cypherError = err.message;
    }

    const context = cypherError
      ? `Cypher error: ${cypherError}`
      : rows.length
        ? JSON.stringify(rows, null, 2)
        : "(no rows returned)";

    const system = new SystemMessage(
      "You answer the user's question using ONLY the supplied Cypher query result. " +
      "If the rows do not contain enough information, say so. Be concise."
    );
    const human = new HumanMessage(
      `Question: ${userQuery}\n\nCypher executed:\n${cypher}\n\nResult rows:\n${context}`
    );
    const resp = await this.llm.invoke([system, human]);

    return {
      graphCypher: cypher,
      graphContext: context,
      graphAnswer: typeof resp.content === "string" ? resp.content : String(resp.content),
    };
  }

  async _writeCypher(question) {
    const system = new SystemMessage(
      "You translate natural-language questions into a single read-only Cypher query " +
      "against the schema below. Output ONLY the Cypher — no commentary, no code fences. " +
      "Prefer variable-length paths (e.g. -[*1..4]-) for multi-hop questions. " +
      "Always RETURN something useful (names, relationship types, paths).\n\n" +
      `SCHEMA:\n${SCHEMA}`
    );
    const human = new HumanMessage(question);
    const resp = await this.llm.invoke([system, human]);
    let text = typeof resp.content === "string" ? resp.content : String(resp.content);
    return text.replace(/^```(?:cypher)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
}
