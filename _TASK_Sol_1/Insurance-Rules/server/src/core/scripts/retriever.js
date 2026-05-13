require("dotenv").config();

const { OpenAIEmbeddings } = require("@langchain/openai");
const { PGVectorStore } = require("@langchain/community/vectorstores/pgvector");

const getRetriever = async (k) => {
    const embeddings = new OpenAIEmbeddings({
        model: "openai/text-embedding-3-small",
        apiKey: process.env.OPENROUTER_API_KEY,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });

    const vectorStore = await PGVectorStore.initialize(embeddings,
        {
            postgresConnectionOptions: {
                type: "postgres",
                host: process.env.PG_HOST,
                port: Number(process.env.PG_PORT),
                user: process.env.PG_READ_USER,
                password: process.env.PG_READ_PASSWORD,
                database: process.env.PG_DATABASE,
            },

            tableName: process.env.TABLE_NAME,

            columns: {
                idColumnName: "id",
                vectorColumnName: "vector",
                contentColumnName: "content",
                metadataColumnName: "metadata",
            },
        }
    );

    return vectorStore.asRetriever(k);
};

module.exports = getRetriever;