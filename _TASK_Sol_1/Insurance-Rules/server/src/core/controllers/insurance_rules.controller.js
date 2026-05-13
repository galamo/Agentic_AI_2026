const path = require("path");
const { createInsuranceRulesGraph } = require("../utilities");

const { graph } = createInsuranceRulesGraph(process.env.OPENROUTER_API_KEY);

const create_rule = async (req, res) => {
    const { rule } = req.body;

    if (!rule) {
        return res.status(400).json({ message: "No rule provided" });
    };

    try {
        const initialState = { rule, answer: null, isExisting: null, reason: null, matchedRuleIds: [] };

        const finalState = await graph.invoke(initialState);

        res.status(200).json({ result: finalState });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    };
};

module.exports = { create_rule };