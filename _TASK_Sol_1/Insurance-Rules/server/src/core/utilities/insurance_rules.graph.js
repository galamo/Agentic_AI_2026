const { getRetriever } = require("../scripts");
const { createIndexRuleAgent, createValidateRuleAgent } = require("./agents");
const { StateGraph, Annotation, START, END } = require("@langchain/langgraph");

const StateAnnotation = Annotation.Root({
    rule: Annotation(),
    reason: Annotation(),
    isExisting: Annotation(),
    matchedRuleIds: Annotation()
});

const createInsuranceRulesGraph = (apiKey) => {
    const index_rule = createIndexRuleAgent(apiKey);
    const validate_rule = createValidateRuleAgent(apiKey);

    const createIndexRuleNode = async (state) => {
        const retriever = await getRetriever(6);

        return index_rule.run(state.rule, retriever);
    };

    const createValidateRuleNode = async (state) => {
        const retriever = await getRetriever(6);

        return validate_rule.run(state.rule, retriever);
    };

    const graph = new StateGraph(StateAnnotation)
        .addNode("IndexRule", createIndexRuleNode)
        .addNode("ValidateRule", createValidateRuleNode)

        .addEdge(START, "ValidateRule")
        .addConditionalEdges("ValidateRule", (state) => state.isExisting ? END : "IndexRule")
        .addEdge("IndexRule", END)

        .compile();

    return { graph };
};

module.exports = createInsuranceRulesGraph;