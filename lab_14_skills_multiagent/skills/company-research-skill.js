/**
 * Company Research Skill – reusable capability: research a company/industry.
 * Used by the Research Agent. Encapsulates the workflow: company + industry hint → structured research.
 * In production this could call external APIs (Clearbit, LinkedIn, etc.) or RAG over a CRM.
 */
export const name = "company_research";
export const description = "Research a company and its industry; returns summary, size, and typical pain points.";

/**
 * @param {Object} input - { companyName: string, industryHint?: string }
 * @returns {Promise<{ summary: string, industry: string, size: string, painPoints: string[] }>}
 */
export async function run(input) {
  const { companyName, industryHint = "" } = input || {};
  const company = String(companyName || "").trim() || "Unknown Company";
  const hint = String(industryHint || "").trim();

  // In a real system: call APIs, vector store, or CRM. Here we return a structured placeholder
  // that an agent can fill via LLM or that could be replaced by real data.
  return {
    summary: `${company} is a company${hint ? ` in the ${hint} sector` : ""}. Research context prepared for qualification and proposal.`,
    industry: hint || "General",
    size: "Mid-market", // Could be SMB, Mid-market, Enterprise
    painPoints: [
      "Operational efficiency",
      "Scaling processes",
      "Integration with existing tools",
    ],
  };
}
