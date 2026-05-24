/**
 * Knowledge base used by BOTH retrievers.
 *
 *  - `sentences` is what the vector store sees: flat natural-language text.
 *  - `triples`   is what the graph store sees: typed (subject, predicate, object) edges.
 *
 * The same facts are expressed both ways so the comparison is apples-to-apples:
 * the only thing that changes between the two RAG branches is HOW the facts
 * are retrieved, not WHICH facts are available.
 */

export const sentences = [
  "Alice is a senior software engineer at Acme Corp.",
  "Bob is the CTO of Acme Corp.",
  "Alice reports to Bob at Acme Corp.",
  "Acme Corp is headquartered in Berlin.",
  "Berlin is the capital of Germany.",
  "Bob previously worked at Globex as a principal engineer.",
  "Charlie founded Globex in 2018.",
  "Globex acquired Initech in 2023.",
  "Initech is based in Munich, Germany.",
  "Dana is a data scientist at Initech.",
  "Dana collaborates with Alice on a joint research project.",
  "Acme Corp partners with Globex on cloud infrastructure.",
];

/**
 * Graph schema (Subject)-[PREDICATE]->(Object) with optional props.
 * Entities are nodes labelled :Person, :Company, or :City.
 */
export const triples = [
  { s: { label: "Person",  name: "Alice"   }, p: "WORKS_AT",         o: { label: "Company", name: "Acme Corp"  }, props: { role: "Senior Software Engineer" } },
  { s: { label: "Person",  name: "Bob"     }, p: "CTO_OF",           o: { label: "Company", name: "Acme Corp"  } },
  { s: { label: "Person",  name: "Alice"   }, p: "REPORTS_TO",       o: { label: "Person",  name: "Bob"        } },
  { s: { label: "Company", name: "Acme Corp" }, p: "HEADQUARTERED_IN", o: { label: "City",    name: "Berlin"   } },
  { s: { label: "City",    name: "Berlin"  }, p: "CAPITAL_OF",       o: { label: "Country", name: "Germany"   } },
  { s: { label: "Person",  name: "Bob"     }, p: "WORKED_AT",        o: { label: "Company", name: "Globex"    }, props: { role: "Principal Engineer", past: true } },
  { s: { label: "Person",  name: "Charlie" }, p: "FOUNDED",          o: { label: "Company", name: "Globex"    }, props: { year: 2018 } },
  { s: { label: "Company", name: "Globex"  }, p: "ACQUIRED",         o: { label: "Company", name: "Initech"   }, props: { year: 2023 } },
  { s: { label: "Company", name: "Initech" }, p: "BASED_IN",         o: { label: "City",    name: "Munich"    } },
  { s: { label: "City",    name: "Munich"  }, p: "LOCATED_IN",       o: { label: "Country", name: "Germany"   } },
  { s: { label: "Person",  name: "Dana"    }, p: "WORKS_AT",         o: { label: "Company", name: "Initech"   }, props: { role: "Data Scientist" } },
  { s: { label: "Person",  name: "Dana"    }, p: "COLLABORATES_WITH", o: { label: "Person", name: "Alice"     } },
  { s: { label: "Company", name: "Acme Corp" }, p: "PARTNERS_WITH",  o: { label: "Company", name: "Globex"    } },
];
