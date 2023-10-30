const express = require("express");
const router = express.Router();
const {
    createThread,
    updateThread,
    readThread,
    createComment,
    updateComment,
    // readCommentReplies,
    fetchFollowers,
    fetchFollowing,
    deleteThread,
    createFollowRequest,
    confirmFollowRequest,
    deleteFollowRequest
} = require("../services/threadsServices");
const auth = require("../middlewares/auth");

router.route("/create-new-thread").post(auth, createThread);
router.route("/update-thread").put(auth, updateThread);
router.route("/read-thread").get(auth, readThread);
router.route("/delete-thread").delete(auth, deleteThread);

router.route("/create-comment").post(auth, createComment);
router.route("/update-comment").put(auth, updateComment);
// router.route("/read-comment-replies").get(auth, readCommentReplies);

router.route("/create-follow-request").post(auth, createFollowRequest);
router.route("/confirm-follow-request").put(auth, confirmFollowRequest);
router.route("/delete-follow-request").delete(auth, deleteFollowRequest);
router.route("/fetch-followers").get(auth, fetchFollowers);
router.route("/fetch-following").get(auth, fetchFollowing);
router.route("/fetch-following-threads").get(auth, fetchFollowingThreads);
router.route("/repost-thread").post(auth, repostThread);
router.route("/fetch-reposted-users").get(auth, fetchRepostedUsers);
router.route("/toggle-thread-like").post(auth, toggleThreadLike);

module.exports = router;
