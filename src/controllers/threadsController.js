const express = require("express");
const router = express.Router();
const { createThread, ReadThread } = require("../services/threadsServices");
const auth = require("../middlewares/auth");

router.route("/newThread").post(auth, createThread);
router.route("/readThread").get(auth,ReadThread);
// router.route("deleteThread").delete(auth,DeleteThread);
module.exports = router;
