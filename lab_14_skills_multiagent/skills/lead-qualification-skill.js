/**
 * Lead Qualification Skill – reusable capability: BANT-style qualification.
 * Used by the Qualifier Agent. Encapsulates: company + research context → score and readiness.
 * In production this could use CRM fields, call scoring APIs, or an LLM to infer from notes.
 */
export const name = "lead_qualification";
export const description = "Score a lead using BANT (Budget, Authority, Need, Timeline); returns score and readiness.";

/**
 * @param {Object} input - { companyName: string, research?: object }
 * @returns {Promise<{ score: number, bant: object, ready: boolean, reasoning: string }>}
 */
export async function run(input) {
  const { companyName, research = {} } = input || {};
  const company = String(companyName || "").trim() || "Unknown";

  // Structured BANT output. In production: CRM lookup, LLM over discovery call notes, or rules engine.
  const bant = {
    budget: { score: 7, note: "Budget signals positive; mid-market typically has allocated spend." },
    authority: { score: 6, note: "Decision-maker engagement to be confirmed." },
    need: { score: 8, note: "Pain points align with our solution." },
    timeline: { score: 7, note: "Quarterly initiative; follow-up within 2 weeks." },
  };
  const total = Object.values(bant).reduce((acc, v) => acc + (v.score || 0), 0);
  const max = 4 * 10;
  const score = Math.round((total / max) * 100);
  const ready = score >= 60;

  return {
    score,
    bant,
    ready,
    reasoning: `${company} qualifies as ${ready ? "sales-ready" : "nurture"}. Overall score ${score}/100.`,
  };
}
