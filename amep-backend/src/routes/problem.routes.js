const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const { getNextProblem } = require("../controllers/problem.controller");

router.get("/next", auth, getNextProblem);

module.exports = router;