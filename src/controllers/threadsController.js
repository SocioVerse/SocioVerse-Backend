const express = require("express");
const router = express.Router();
const {
    createThread,
    updateThread,
    readThread,
    createComment,
    updateComment,
    readCommentReplies,
    deleteThread,
    fetchRepostedUsers,
    toggleThreadLike,
    
} = require("../services/threadsServices");
const auth = require("../middlewares/auth");

router.route("/create-new-thread").post(auth, createThread); //Done
router.route("/update-thread").put(auth, updateThread);  //Done
router.route("/read-thread").get(auth, readThread); //Done
router.route("/delete-thread").delete(auth, deleteThread); //Done

router.route("/create-comment").post(auth, createComment); //Done
router.route("/update-comment").put(auth, updateComment);
router.route("/read-comment-replies").get(auth, readCommentReplies);



router.route("/fetch-reposted-users").get(auth, fetchRepostedUsers);
router.route("/toggle-thread-like").post(auth, toggleThreadLike);
module.exports = router;
