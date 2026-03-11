/**
 * Fetch Users Agent – has a tool to call the Random User API.
 * Fetches N random users from https://randomuser.me/api/
 * Used as a node in the LangGraph; reads userCount from state, writes randomUsers.
 */

const RANDOM_USER_API = "https://randomuser.me/api/";

/**
 * Tool: call Random User API and return the results array.
 * @param {number} count - Number of users to fetch (1–5000 per API docs).
 * @returns {Promise<Object[]>} Array of user objects from the API.
 */
export async function randomUsersApi(count) {
  const n = Math.min(Math.max(1, Number(count) || 10), 100);
  const url = `${RANDOM_USER_API}?results=${n}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Random User API error: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

export class FetchUsersAgent {
  constructor() {
    this.name = "FetchUsersAgent";
  }

  /**
   * Node function: uses randomUsersApi tool to fetch users, returns partial state update.
   * @param {Object} state - Graph state with userCount
   * @returns {Promise<{ randomUsers: Object[] }>}
   */
  async run(state) {
    const userCount = state.userCount ?? 10;
    const users = await randomUsersApi(userCount);
    return { randomUsers: users };
  }

  getInfo() {
    return { name: this.name, role: "Fetch random users via Random User API" };
  }
}
