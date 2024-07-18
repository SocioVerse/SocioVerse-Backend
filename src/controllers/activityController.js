const express = require("express");
const router = express.Router();
const {
    feedsActivity,
    threadsActivity,
    feedCommentsActivity,
    threadCommentsActivity,
    storyLikesActivity,
    mentionsActivity
} = require("../services/activityServices");
const { auth } = require("../middlewares/auth");

router.route("/feeds").get(auth, feedsActivity);
router.route("/feeds-comments").get(auth, feedCommentsActivity);
router.route("/threads").get(auth, threadsActivity);
router.route("/threads-comments").get(auth, threadCommentsActivity);
router.route("/story-likes").get(auth, storyLikesActivity);
router.route("/mentions").get(auth, mentionsActivity);

module.exports = router;