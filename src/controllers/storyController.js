const express = require("express");
const router = express.Router();
const {
    createNewStory,
    readStory,
    deleteStory,
    toggleStoryLike,
    storySeen,
    getUserByStoryId,
} = require("../services/storyServices");
const { auth } = require("../middlewares/auth");


router.route("/create-story").post(auth, createNewStory); //Done
router.route("/read-story").get(auth, readStory); //Done
router.route("/delete-story").delete(auth, deleteStory); //Done
router.route("/toggle-story-like").post(auth, toggleStoryLike); //Done
router.route("/story-seen").post(auth, storySeen); //Done
router.route("/get-user-by-storyId").get(auth, getUserByStoryId); //Done

module.exports = router;
