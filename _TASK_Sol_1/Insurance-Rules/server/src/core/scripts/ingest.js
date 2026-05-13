require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { Document } = require("@langchain/core/documents");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { PGVectorStore } = require("@langchain/community/vectorstores/pgvector");

const listsDir = path.join(__dirname, "../../data/lists");
const rulesFile = path.join(__dirname, "../../data/rules/insurance_rules.jsonl");

/* ---------------------------------------------------
   1️⃣ Load lists
---------------------------------------------------- */
const loadLists = () => {
    if (!fs.existsSync(listsDir)) {
        throw new Error("Lists folder not found at " + listsDir);
    };

    const files = fs.readdirSync(listsDir).filter((file) => file.endsWith(".json"));

    if (!files.length) {
        throw new Error("No list json files found");
    };

    const lists = {};

    for (const file of files) {
        const fullPath = path.join(listsDir, file);
        const raw = JSON.parse(fs.readFileSync(fullPath, "utf8"));

        lists[raw.list_name] = raw;
    };

    return lists;
};

/* ---------------------------------------------------
   2️⃣ Extract referenced lists from rules
---------------------------------------------------- */
const extractReferencedLists = (ruleText) => {
    const regex = /\bin_list\s+([a-zA-Z0-9_]+)/g;
    const names = [];
    let match;

    while ((match = regex.exec(ruleText)) !== null) {
        names.push(match[1]);
    };

    return [...new Set(names)];
};

/* ---------------------------------------------------
   3️⃣ Build rule embedding text
---------------------------------------------------- */
const buildRuleEmbeddingText = (rule, lists) => {
    const referencedLists = extractReferencedLists(rule.text);

    const expansions = referencedLists
        .map((name) => {
            const list = lists[name];
            if (!list) return null;

            return `${name} includes ${list.items.join(", ")}`;
        })
        .filter(Boolean)
        .join(". ");

    return `
        Rule ${rule.id}.
        ${rule.text}.
        ${expansions}.
        Action is ${rule.action}.
        Tags: ${rule.tags.join(", ")}.
    `.trim();
};

/* ---------------------------------------------------
   4️⃣ Create list documents
---------------------------------------------------- */
const buildListDocuments = (lists) => {
    return Object.values(lists).map((list) => {
        return new Document({
            pageContent: `
                List ${list.list_name}.
                ${list.description}
                Includes: ${list.items.join(", ")}.
            `.trim(),

            metadata: {
                doc_type: "list",
                list_name: list.list_name,
                item_count: list.items.length,
                items: list.items,
            },
        });
    });
};

/* ---------------------------------------------------
   5️⃣ Create rule documents
---------------------------------------------------- */
const buildRuleDocuments = (lists) => {
    if (!fs.existsSync(rulesFile)) {
        throw new Error("Rules file not found at " + rulesFile);
    };

    const lines = fs
        .readFileSync(rulesFile, "utf8")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

    return lines.map((line) => {
        const rule = JSON.parse(line);
        const referencedLists = extractReferencedLists(rule.text);

        return new Document({
            pageContent: buildRuleEmbeddingText(rule, lists),

            metadata: {
                doc_type: "rule",
                rule_id: rule.id,
                raw_text: rule.text,
                action: rule.action,
                tags: rule.tags,
                referenced_lists: referencedLists,
            },
        });
    });
};

/* ---------------------------------------------------
   6️⃣ Main indexing
---------------------------------------------------- */
async function main() {
    console.log("Loading insurance data...");

    const lists = loadLists();

    const listDocs = buildListDocuments(lists);
    const ruleDocs = buildRuleDocuments(lists);

    const docs = [...listDocs, ...ruleDocs];

    console.log(`Documents to index: ${docs.length}`);

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error(
            "Set OPENROUTER_API_KEY in your .env file"
        );
    };

    const embeddings = new OpenAIEmbeddings({
        model: "openai/text-embedding-3-small",
        apiKey,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });

    const config = {
        postgresConnectionOptions: {
            type: "postgres",
            host: process.env.PG_HOST,
            port: Number(process.env.PG_PORT),
            user: process.env.PG_WRITE_USER,
            password: process.env.PG_WRITE_PASSWORD,
            database: process.env.PG_DATABASE,
        },

        tableName: process.env.TABLE_NAME,

        columns: {
            idColumnName: "id",
            vectorColumnName: "vector",
            contentColumnName: "content",
            metadataColumnName: "metadata",
        },
    };

    console.log("Connecting to pgvector...");

    const vectorStore = await PGVectorStore.initialize(
        embeddings,
        config
    );

    const ids = docs.map(() => uuidv4());

    await vectorStore.addDocuments(docs, { ids });

    console.log(
        `✅ Indexed ${docs.length} documents into ${process.env.TABLE_NAME}`
    );

    await vectorStore.end();

    console.log("Done.");
}

main().catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
});