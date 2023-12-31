const express = require("express");
const router = express.Router();
const {
    createNewStory,
    readStory,
    deleteStory,
    toogleStoryLike,
    storySeen,
} = require("../services/storyServices");
const { auth } = require("../middlewares/auth");


router.route("/create-story").post(auth, createNewStory); //Done
router.route("/read-story").get(auth, readStory); //Done
router.route("/delete-story").delete(auth, deleteStory); //Done
router.route("/toogle-story-like").post(auth, toogleStoryLike); //Done
router.route("/story-seen").post(auth, storySeen); //Done


module.exports = router;
