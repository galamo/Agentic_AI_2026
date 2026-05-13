const { Router } = require("express");

const createInsuranceRulesRoute = Router();

const { createInsuranceRulesController } = require("../controllers");

createInsuranceRulesRoute.post("/", createInsuranceRulesController.create_rule);

module.exports = createInsuranceRulesRoute;