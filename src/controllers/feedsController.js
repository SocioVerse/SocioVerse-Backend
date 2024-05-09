const express = require("express");
const router = express.Router();
const {
    createFeed,
    updateFeed,
    readFeed,
    createFeedComment,
    updateFeedComment,
    fetchFeedComment,
    fetchCommentReply,
    createCommentReply,
    deleteFeedComment,
    deleteFeed,
    toggleFeedCommentLike,
    toggleFeedLike,
    getLikedFeeds,
    toggleFeedSave,
    getSavedFeeds,
    fetchMentionedUsers,
    searchLocation,
    searchHashtags,
    fetchFeedLikes,
    fetchTrendingFeeds,
    getFeedById
} = require("../services/feedsServices");
const { auth } = require("../middlewares/auth");


router.route("/create-new-feed").post(auth, createFeed); //Done
router.route("/update-feed").put(auth, updateFeed); //Done
router.route("/read-feed").get(auth, readFeed); //Done
router.route("/delete-feed").delete(auth, deleteFeed); //Done

router.route("/create-feed-comment").post(auth, createFeedComment);//Done
router.route("/update-feed-comment").put(auth, updateFeedComment);
router.route("/fetch-feed-comments").get(auth, fetchFeedComment); //Done
router.route("/delete-feed-commment").delete(auth, deleteFeedComment); //Done
router.route("/fetch-feed-by-id").get(auth, getFeedById); //Done
router.route("/toggle-feed-commment-like").post(auth, toggleFeedCommentLike); //Done
router.route("/create-comment-reply").post(auth, createCommentReply); //Done
router.route("/fetch-comment-replies").get(auth, fetchCommentReply); //Done

router.route("/toggle-feed-like").post(auth, toggleFeedLike); //Done
router.route("/liked-feeds").get(auth, getLikedFeeds); //Done

router.route("/toggle-feed-save").post(auth, toggleFeedSave); //Done
router.route("/saved-feeds").get(auth, getSavedFeeds); //Done

router.route("/fetch-mentioned-users").get(auth, fetchMentionedUsers); //Done

router.route("/search-location").get(auth, searchLocation); //Done
router.route("/search-hashtags").get(auth, searchHashtags); //Done

router.route("/fetch-feed-likes").get(auth, fetchFeedLikes);//Done 
router.route("/fetch-trending-feeds").get(auth, fetchTrendingFeeds);
module.exports = router;
