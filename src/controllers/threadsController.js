const express = require("express");
const router = express.Router();
const { createThread, updateThread, readThread, fetchFollowers, fetchFollowing,deleteThread, createFollowRequest, confirmFollowRequest, deleteFollowRequest } = require("../services/threadsServices");
const auth = require("../middlewares/auth");

router.route("/newThread").post(auth, createThread);
router.route("/update-thread").put(auth, updateThread);
router.route("/read-thread").get(auth, readThread);
router.route("/delete-thread").delete(auth, deleteThread); 

router.route("/create-follow-request").post(auth,createFollowRequest);
router.route("/confirm-follow-request").put(auth,confirmFollowRequest);
router.route("/delete-follow-request").delete(auth,deleteFollowRequest);
router.route("/fetch-followers").get(auth, fetchFollowers);
router.route("/fetch-following").get(auth, fetchFollowing); 
module.exports = router;
