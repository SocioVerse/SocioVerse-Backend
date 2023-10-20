const express = require("express");
const router = express.Router();
const { createThread } = require("../services/threadsServices");
const auth = require("../middlewares/auth");

router.route("/newThread").post(auth, createThread);
module.exports = router;
