const express = require("express");
const { refresh } = require("../services/refreshService");
const router = express.Router();

router.post("/refresh", refresh)


module.exports = router;

