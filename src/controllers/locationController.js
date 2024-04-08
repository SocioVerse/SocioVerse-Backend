const express = require("express");
const {
    fetchLocationFeeds,
} = require("../services/locationServices");
const router = express.Router();
const { auth } = require("../middlewares/auth");

router.route("/fetch-location-feeds").get(auth, fetchLocationFeeds);
module.exports = router;


