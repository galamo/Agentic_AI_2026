/**
 * Proposal Draft Skill – reusable capability: draft a one-pager proposal.
 * Used by the Writer Agent. Input: company, research, qualification → structured proposal text.
 * This skill returns a template structure; the Writer Agent uses the LLM to fill it with personalized content.
 */
export const name = "proposal_draft";
export const description = "Produce a proposal structure and sections for a given company using research and qualification.";

/**
 * @param {Object} input - { companyName: string, research?: object, qualification?: object }
 * @returns {Promise<{ sections: string[], template: string }>}
 */
export async function run(input) {
  const { companyName, research = {}, qualification = {} } = input || {};
  const company = String(companyName || "").trim() || "Valued Client";

  const sections = [
    "Executive summary",
    "Understanding your needs",
    "Recommended solution",
    "Expected outcomes",
    "Next steps",
  ];

  const template = [
    `# Proposal: ${company}`,
    "",
    "## Executive summary",
    "[Personalized 2–3 sentences based on research and qualification.]",
    "",
    "## Understanding your needs",
    "[Reference industry, size, and pain points from research.]",
    "",
    "## Recommended solution",
    "[Tailored offering.]",
    "",
    "## Expected outcomes",
    "[Benefits aligned to their situation.]",
    "",
    "## Next steps",
    "[Clear CTA and timeline; consider qualification readiness.]",
  ].join("\n");

  return {
    sections,
    template,
    meta: {
      company,
      qualificationScore: qualification?.score,
      ready: qualification?.ready,
    },
  };
}
