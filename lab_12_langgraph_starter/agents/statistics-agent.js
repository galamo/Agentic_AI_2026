/**
 * Statistics Agent – receives random users and requested statistic types,
 * computes aggregations (by age, by location, by gender) and returns a JSON array.
 * Used as a node in the LangGraph; reads randomUsers + statisticsRequested, writes aggregations.
 */

export class StatisticsAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.name = "StatisticsAgent";
  }

  /**
   * Compute aggregations from users based on requested types.
   * @param {Object[]} users - Array of Random User API result objects.
   * @param {string[]} requested - e.g. ['age', 'location', 'gender']
   * @returns {Object[]} Array of aggregation objects for the report.
   */
  computeAggregations(users, requested) {
    if (!Array.isArray(users) || users.length === 0) {
      return [{ type: "error", message: "No users to aggregate" }];
    }

    const aggregations = [];
    const lower = (requested || []).map((s) => String(s).toLowerCase());

    if (lower.includes("age")) {
      const byAge = {};
      for (const u of users) {
        const age = u.dob?.age ?? 0;
        byAge[age] = (byAge[age] || 0) + 1;
      }
      const buckets = { "0-17": 0, "18-30": 0, "31-45": 0, "46-60": 0, "61+": 0 };
      for (const [ageStr, count] of Object.entries(byAge)) {
        const age = Number(ageStr);
        if (age <= 17) buckets["0-17"] += count;
        else if (age <= 30) buckets["18-30"] += count;
        else if (age <= 45) buckets["31-45"] += count;
        else if (age <= 60) buckets["46-60"] += count;
        else buckets["61+"] += count;
      }
      aggregations.push({ type: "by_age", buckets, total: users.length });
    }

    if (lower.includes("location")) {
      const byCountry = {};
      const byState = {};
      for (const u of users) {
        const country = u.location?.country ?? "Unknown";
        const state = u.location?.state ?? "Unknown";
        byCountry[country] = (byCountry[country] || 0) + 1;
        byState[state] = (byState[state] || 0) + 1;
      }
      aggregations.push({ type: "by_location", byCountry, byState, total: users.length });
    }

    if (lower.includes("gender")) {
      const byGender = {};
      for (const u of users) {
        const g = u.gender ?? "unknown";
        byGender[g] = (byGender[g] || 0) + 1;
      }
      aggregations.push({ type: "by_gender", byGender, total: users.length });
    }

    if (aggregations.length === 0) {
      aggregations.push({ type: "info", message: "No statistic types requested; add age, location, or gender." });
    }

    return aggregations;
  }

  /**
   * Node function: computes aggregations from state.randomUsers and state.statisticsRequested.
   * @param {Object} state - Graph state with randomUsers, statisticsRequested
   * @returns {Promise<{ aggregations: Object[] }>}
   */
  async run(state) {
    const users = state.randomUsers ?? [];
    const requested = state.statisticsRequested ?? ["age", "location"];
    const aggregations = this.computeAggregations(users, requested);
    return { aggregations };
  }

  getInfo() {
    return { name: this.name, role: "Compute statistics (by age, location, gender) from random users" };
  }
}
