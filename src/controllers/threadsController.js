const express = require("express");
const router = express.Router();
const { createThread,updateThread,readThread, fetchFollowers } = require("../services/threadsServices");
const auth = require("../middlewares/auth");

router.route("/newThread").post(auth, createThread);
router.route("/update-thread/:threadId").put(auth, updateThread);
router.route("/read-thread").get(auth, readThread);
router.route("/delete-thread/:threadId").delete(auth,deleteThread);

router.route("/fetch-folowers").get(auth,fetchFollowers);
router.route("fetch-following").get(auth,fetchFollowing);
module.exports = router;
