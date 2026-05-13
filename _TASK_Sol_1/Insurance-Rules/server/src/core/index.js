const { createInsuranceRulesRoute } = require("./routes");
const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (_req, res) => res.json({ ok: true }));

app.use("/insurance-rules", createInsuranceRulesRoute);

module.exports = {
    app,
    port: 3000
};