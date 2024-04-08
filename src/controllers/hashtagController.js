const express = require("express");
const {
    fetchHashtagsFeeds,
} = require("../services/hashtagServices");
const router = express.Router();
const { auth } = require("../middlewares/auth");

router.route("/fetch-hashtags-feeds").get(auth, fetchHashtagsFeeds);
module.exports = router;


