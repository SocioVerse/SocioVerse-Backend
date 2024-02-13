const express = require("express");
const router = express.Router();
const {
    createFeed,
    updateFeed,
    readFeed,
    createFeedComment,
    updateFeedComment,
    readFeedCommentReplies,
    deleteFeed,
    toggleFeedLike,
    getLikedFeeds,
    toggleFeedSave,
    getSavedFeeds,
} = require("../services/feedsServices");
const { auth } = require("../middlewares/auth");


router.route("/create-new-feed").post(auth, createFeed); //Done
router.route("/update-feed").put(auth, updateFeed); //Done
router.route("/read-feed").get(auth, readFeed); //Done
router.route("/delete-feed").delete(auth, deleteFeed); //Done

router.route("/create-feed-comment").post(auth, createFeedComment); //Done
router.route("/update-feed-comment").put(auth, updateFeedComment);
router.route("/read-feed-comment-replies").get(auth, readFeedCommentReplies);

router.route("/toggle-feed-like").post(auth, toggleFeedLike);
router.route("/liked-feeds").get(auth, getLikedFeeds);

router.route("/toggle-feed-save").post(auth, toggleFeedSave);
router.route("/saved-feeds").get(auth, getSavedFeeds);
module.exports = router;
