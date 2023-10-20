const express = require("express");
const router = express.Router();
const { createThread, updateThread } = require("../services/threadsServices");
const auth = require("../middlewares/auth");

router.route("/new-thread").post(auth, createThread);
router.route("/update-thread/:threadId").put(auth, updateThread);
module.exports = router;
