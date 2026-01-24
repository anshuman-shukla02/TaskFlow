const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const { submitSolution } = require("../controllers/submission.controller");

router.post("/", auth, submitSolution);

module.exports = router;