const {
    ControllerResponse,
    ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Feed = require("../models/feedModel");
const Hashtag = require("../models/hashtagModel");
const Location = require("../models/locationModel");
const Follow = require("../models/follows");
const FirebaseAdminService = require("../utils/adminFireBaseService");
const DeviceFCMToken = require("../models/deviceFcmTocken");



//Service functions
module.exports.createFeed = BigPromise(async (req, res) => {
    console.log(req.body, "req.body");
    try {
        const {
            mentions, // user ids
            tags,  // string list
            location, // location : { name, type, state, country, latitude, longitude}
            auto_enhanced, // boolean
            caption, // string
            is_private, // boolean
            allow_comments, // boolean
            allow_save, // boolean
            images // string list
        } = req.body;

        // Check if location exists
        let locationId = null;
        if (location) {
            const locationExists = await Location.findOne({
                name: location.name,
                state: location.state,
                type: location.type,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,

            });
            if (locationExists) {
                locationId = locationExists._id;
            } else {
                const newLocation = await Location.create({
                    name: location.name,
                    type: location.type,
                    state: location.state,
                    country: location.country,
                    latitude: location.latitude,
                    longitude: location.longitude,
                });
                locationId = newLocation._id;
            }
        }

        // Check if tags exists
        let tagsIds = [];
        if (tags) {
            for (let i = 0; i < tags.length; i++) {
                const tagExists = await Hashtag.findOne({
                    hashtag: tags[i],
                });
                if (tagExists) {
                    tagsIds.push(tagExists._id);
                    tagExists.post_count += 1;
                } else {
                    const newTag = await Hashtag.create({
                        hashtag: tags[i],
                        post_count: 1,
                    });
                    tagsIds.push(newTag._id);
                }
            }
        }
        // Check if mentions exists
        let mentionsIds = [];
        if (mentions) {
            for (let i = 0; i < mentions.length; i++) {
                const mentionExists = await Users.findOne({
                    username: mentions[i],
                });
                if (mentionExists) {
                    mentionsIds.push(mentionExists._id);
                }
            }
        }
        // Create feed
        await Feed.create({
            user_id: req.user._id,
            images: images,
            mentions: mentionsIds,
            tags: tagsIds,
            location: locationId,
            auto_enhanced: auto_enhanced,
            caption: caption,
            is_private: is_private,
            allow_comments: allow_comments,
            allow_save: allow_save,
        });



        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.readFeed = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.updateFeed = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.deleteFeed = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.createFeedComment = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.updateFeedComment = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});
module.exports.readFeedCommentReplies = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});


module.exports.toggleFeedLike = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.getLikedFeeds = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.toggleFeedSave = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.getSavedFeeds = BigPromise(async (req, res) => {
    try {

        ControllerResponse(res, 200, {});
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});