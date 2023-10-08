const express = require("express");
const { signup } = require("../services/usersServices")
const router = express.Router();

//comment
router.route("/signup").post(signup)
module.exports = router;

