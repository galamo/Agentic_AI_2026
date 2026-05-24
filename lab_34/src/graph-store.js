/**
 * Thin wrapper around neo4j-driver: open a session, run Cypher, close it.
 */
import neo4j from "neo4j-driver";

export function createGraphStore({ uri, user, password }) {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  async function run(cypher, params = {}) {
    const session = driver.session();
    try {
      const res = await session.run(cypher, params);
      return res.records.map((r) => {
        const obj = {};
        for (const key of r.keys) obj[key] = normalize(r.get(key));
        return obj;
      });
    } finally {
      await session.close();
    }
  }

  async function close() {
    await driver.close();
  }

  return { run, close };
}

/** Convert Neo4j types to plain JS so they print nicely. */
function normalize(v) {
  if (v == null) return v;
  if (neo4j.isInt(v)) return v.toNumber();
  if (Array.isArray(v)) return v.map(normalize);
  if (v.labels && v.properties) return { _labels: v.labels, ...mapProps(v.properties) };
  if (v.type && v.properties && v.start != null) {
    return { _type: v.type, ...mapProps(v.properties) };
  }
  if (typeof v === "object") return mapProps(v);
  return v;
}

function mapProps(props) {
  const out = {};
  for (const k of Object.keys(props)) out[k] = normalize(props[k]);
  return out;
}
