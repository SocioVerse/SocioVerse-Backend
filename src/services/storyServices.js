const {
    ControllerResponse,
    ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Thread = require("../models/threadsModel");
const Follow = require("../models/follows");
const RepostedThread = require("../models/repostedThread");
const ThreadLikes = require("../models/threadLikes");
const ThreadSaves = require("../models/threadSaves");
const { default: mongoose } = require("mongoose");
const FirebaseAdminService = require("../utils/adminFireBaseService");
const DeviceFCMToken = require("../models/deviceFcmTocken");
const Story = require("../models/storyModel");
const StorySeen = require("../models/storySeens");
const StoryLike = require("../models/storyLikes");



module.exports.getUserByStoryId = BigPromise(async (req, res) => {
    try {
        const { story_id } = req.query;
        const story = await Story.findById(story_id);
        if (!story) {
            return ErrorHandler(res, 400, "Story not found");
        }
        const user = await Users.findById(story.user_id);
        const isFollower = await Follow.find({
            followed_by: req.user._id,
            followed_to: user._id,
            is_confirmed: true
        })
        if (!isFollower) {
            return ErrorHandler(res, 400, "Story is private")
        }
        user._doc.isOwner = req.user._id == user._id;
        console.log(user, "user");
        ControllerResponse(res, 200, user);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});
module.exports.createNewStory = BigPromise(async (req, res) => {
    try {
        const { images } = req.body;

        for (const image of images) {
            const newStory = new Story({
                user_id: req.user._id,
                image: image,
            });
            await newStory.save();
        }
        ControllerResponse(res, 200, "Story Created Successfully");
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.readStory = BigPromise(async (req, res) => {
    try {
        const { user_id, story_id } = req.query;
        if (!user_id) {

            const story = await Story.findById(story_id);

            const storyLike = await StoryLike.findOne({ story_id: story._id, liked_by: req.user._id });
            if (storyLike) {
                story._doc.is_liked = true;
            }
            else {
                story._doc.is_liked = false;
            }
            ControllerResponse(res, 200, { result: [...story] });
        }
        const result = await Story.find({ user_id: user_id });
        //Add is liked
        for (const story of result) {

            const storyLike = await StoryLike.findOne({ story_id: story._id, liked_by: req.user._id });
            if (storyLike) {
                story._doc.is_liked = true;
            }
            else {
                story._doc.is_liked = false;
            }

        }


        ControllerResponse(res, 200, result);
    } catch (err) {
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.deleteStory = BigPromise(async (req, res) => {
    try {

        const { story_id } = req.query;

        await Story.findByIdAndDelete(story_id);
        await StoryLike.deleteMany({ story_id: story_id });
        await StorySeen.deleteMany({ story_id: story_id });


        ControllerResponse(res, 200, "Story Deleted Successfully");
    } catch (err) {
        ErrorHandler(res, 500, "Internal Server Error");
    }
});
module.exports.deleteOldStories = async () => {
    try {

        const findStory = await Story.find({ createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
        for (const story of findStory) {
            await StoryLike.deleteMany({ story_id: story._id });
            await StorySeen.deleteMany({ story_id: story._id });
            await Story.findByIdAndDelete(story._id);
        }
    } catch (err) {
        console.log(err);
    }
};



module.exports.toggleStoryLike = BigPromise(async (req, res) => {
    try {
        const { story_id } = req.body;
        const storyLike = await StoryLike.findOne({
            story_id: story_id,
            liked_by: req.user._id,
        });




        if (storyLike) {
            await storyLike.deleteOne();
            // decrement like count
            await Story.findByIdAndUpdate(story_id, {
                $inc: { like_count: -1 },
            });
        }
        else {
            const newStoryLike = new StoryLike({
                story_id: story_id,
                liked_by: req.user._id,
            });
            await newStoryLike.save();
            // increment like count

            await Story.findByIdAndUpdate(story_id, {
                $inc: { like_count: 1 },
            });
            const targetUserId = await Story.findById(story_id,);
            const user = await Users.findById(req.user._id);
            const fcmTokens = await DeviceFCMToken.find(
                {
                    $and: [
                        { user_id: targetUserId.user_id },
                        { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } },
                    ],
                },
                { fcm_token: 1 }
            );
            console.log(fcmTokens);
            if (fcmTokens != null && fcmTokens.length > 0)
                await FirebaseAdminService.sendNotifications({
                    fcmTokens: fcmTokens.map((fcmToken) => fcmToken.fcm_token),
                    notification: "New Story Like",
                    body: user.username + " just liked your story",
                    type: "story-like",
                });
        }

        ControllerResponse(res, 200, "Story Like Toggled Successfully");
    } catch (err) {
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.storySeen = BigPromise(async (req, res) => {
    try {
        const { story_id } = req.body;

        const alreadySeen = await StorySeen.findOne({
            story_id: story_id,
            seen_by: req.user._id,
        });
        if (alreadySeen) {
            return ControllerResponse(res, 200, "Story Seen Successfully");
        }

        const newStorySeen = new StorySeen({
            story_id: story_id,
            seen_by: req.user._id,
        });
        await newStorySeen.save();
        await Story.findByIdAndUpdate(story_id, {
            $inc: { view_count: 1 },
        });
        ControllerResponse(res, 200, "Story Seen Successfully");
    } catch (err) {
        ErrorHandler(res, 500, "Internal Server Error");
    }
});




