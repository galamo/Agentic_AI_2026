import { runSkill } from "../skills/index.js";

/**
 * Qualifier Agent – uses the lead_qualification skill.
 * Reads plan + companyResearch, writes leadQualification to state.
 */
export class QualifierAgent {
  constructor(_apiKey) {
    this.name = "QualifierAgent";
  }

  /**
   * @param {Object} state - Graph state with plan, companyResearch
   * @returns {Promise<{ leadQualification: object }>}
   */
  async run(state) {
    const plan = state.plan || {};
    const companyResearch = state.companyResearch || {};
    const companyName = plan.companyName || "Unknown";

    const leadQualification = await runSkill("lead_qualification", {
      companyName,
      research: companyResearch,
    });
    return { leadQualification };
  }

  getInfo() {
    return { name: this.name, role: "Lead qualification (skill: lead_qualification)" };
  }
}
