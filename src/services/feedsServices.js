const {
    ControllerResponse,
    ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Feed = require("../models/feedModel");
const Hashtag = require("../models/hashtagModel");
const Location = require("../models/locationModel");
const FeedLikes = require("../models/feedLikesModel");
const FeedSaves = require("../models/feedSavesModel");
const FeedComments = require("../models/feedComments");
const FeedCommetLikes = require("../models/feedCommentLike");
const Follow = require("../models/follows");
const FirebaseAdminService = require("../utils/adminFireBaseService");
const DeviceFCMToken = require("../models/deviceFcmTocken");
const axios = require('axios');
const mongoose = require('mongoose');


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
                locationExists.post_count += 1;
                await locationExists.save();
            } else {
                const newLocation = await Location.create({
                    name: location.name,
                    type: location.type,
                    state: location.state,
                    country: location.country,
                    latitude: location.latitude,
                    post_count: 1,
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
                    await tagExists.save();
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
        //update post count
        Users.findByIdAndUpdate(req.user._id, { $inc: { post_count: 1 } }, { new: true }).exec();


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
        const { feedId } = req.query;

        const relatedComment = await FeedComments.find({
            parent_feed: feedId,
        });
        for (let i = 0; i < relatedComment.length; i++) {
            await Promise.all([
                FeedLikes.deleteMany({
                    comment_id: relatedComment[i]._id,
                }),
                FeedComments.deleteMany({
                    parent_comment: relatedComment[i]._id,
                }),
            ]);
        }
        const feed = await Feed.findById(feedId);
        console.log(feed, "feed");
        // decrease location count
        if (feed.location) {
            const location = await Location.findById(feed.location);
            location.post_count--;
            await location.save();
        }
        // decrease hashtag count
        for (let i = 0; i < feed.tags.length; i++) {
            const tag = await Hashtag.findById(feed.tags[i
            ]);
            tag.post_count--;
            await tag.save();
        }
        // delete feed
        await Feed.findByIdAndRemove(feedId);
        await FeedLikes.deleteMany({
            feed_id: feedId,
        });
        await FeedSaves.deleteMany({
            feed_id: feedId,
        });



        await Users.findByIdAndUpdate(req.user._id, { $inc: { post_count: -1 } }, { new: true }).exec();

        ControllerResponse(res, 200, "Feed deleted successfully");
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.createFeedComment = BigPromise(async (req, res) => {
    try {
        const { feedId, content } = req.body;
        const newComment = await FeedComments.create({
            user_id: req.user._id,
            parent_feed: feedId,
            content: content,
        });
        const feed = await Feed.findById(feedId);
        feed.comment_count++;
        await feed.save();

        const user = await Users.findById(req.user._id);

        const data = {
            _id: newComment._id,
            user_id: {
                _id: user._id,
                username: user.username,
                profile_pic: user.profile_pic,
                occupation: user.occupation,
                isOwner: true,
            },
            isLiked: false,
            parent_feed: feedId,
            parent_comment: newComment._id,
            content: content,
            like_count: 0,
            comment_count: 0,
            createdAt: newComment.createdAt,
        };

        // const fcmTokens = await DeviceFCMToken.find({
        //     $and: [
        //         { user_id: feed.user_id },
        //         { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } }
        //     ]
        // }, { fcm_token: 1, user_id: 1 });
        // console.log(fcmTokens);
        // if (fcmTokens.length > 0)
        //     await FirebaseAdminService.sendNotifications({
        //         fcmTokens: fcmTokens.map(
        //             (fcmToken) => fcmToken.fcm_token
        //         ), notification: "New Comment", body: req.user.username + " just commented on your feed"
        //     });



        ControllerResponse(res, 200, {
            comment: data,
        });
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


module.exports.deleteFeedComment = BigPromise(async (req, res) => {
    try {
        const { commentId } = req.query;
        async function deleteCommentRecursively(commentId) {
            const allChildComment = await FeedComments.find({ parent_comment: commentId });
            for (let i = 0; i < allChildComment.length; i++) {
                deleteCommentRecursively(allChildComment[i]._id);
            }
            await FeedComments.findByIdAndRemove(commentId);
            await FeedCommetLikes.deleteMany({ comment_id: commentId });

        }
        const parentComment = await FeedComments.findById(commentId);
        console.log(parentComment, "parentComment");
        if (parentComment != null && commentId.toString() !== parentComment.parent_comment.toString()) {
            await FeedComments.findByIdAndUpdate(parentComment.parent_comment, { $inc: { comment_count: -1 } }, { new: true }).exec();
            await parentComment.save();
        }
        else {
            const feed = await Feed.findById(parentComment.parent_feed);
            feed.comment_count--;
            await feed.save();
        }

        deleteCommentRecursively(commentId);

        ControllerResponse(res, 200,
            "Comment deleted successfully"
        );
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.createCommentReply = BigPromise(async (req, res) => {
    try {
        const { content, commentId } = req.body;
        const parentComment = await FeedComments.findById(commentId);
        const commentReply = await FeedComments.create({
            comment_count: 0,
            like_count: 0,
            content: content,
            parent_comment: parentComment.id,
            parent_feed: parentComment.parent_feed,
            user_id: req.user._id
        });
        parentComment.comment_count++;
        await parentComment.save();
        const user = await Users.findById(req.user._id);
        const data = {
            _id: commentReply._id,
            user_id: {
                _id: user._id,
                username: user.username,
                profile_pic: user.profile_pic,
                occupation: user.occupation,
                isOwner: true,
            },
            isLiked: false,
            parent_feed: parentComment.parent_feed,
            parent_comment: parentComment._id,
            content: content,
            like_count: 0,
            comment_count: 0,
            createdAt: commentReply.createdAt,
        };

        ControllerResponse(res, 200, data);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.toggleFeedCommentLike = BigPromise(async (req, res) => {
    try {
        const { commentId } = req.body;
        const likedBy = req.user._id;
        const comment = await FeedComments.findById(commentId);
        const existingLike = await FeedCommetLikes.findOne({
            comment_id: commentId,
            liked_by: likedBy,
        });
        if (existingLike) {
            await FeedCommetLikes.findByIdAndRemove(existingLike._id);
            comment.like_count--;
            await comment.save();
        } else {
            const newLike = new FeedCommetLikes({
                comment_id: commentId,
                liked_by: likedBy,
            });
            await newLike.save();
            comment.like_count++;
            await comment.save();
        }

        ControllerResponse(res, 200, "Like/Dislike toggled successfully");
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});
module.exports.fetchFeedComment = BigPromise(async (req, res) => {
    try {
        const { feedId } = req.query;
        const allComments = await FeedComments.find({
            parent_feed: feedId,
        }).sort({ createdAt: -1 });
        const comments = allComments.filter(
            (comment) => comment.parent_comment.toString() === comment._id.toString());
        for (let i = 0; i < comments.length; i++) {
            const user = await Users.findById(comments[i].user_id,
                {
                    _id: 1,
                    username: 1,
                    profile_pic: 1,
                    occupation: 1,
                }
            );
            const isLiked = await FeedCommetLikes.findOne({
                comment_id: comments[i]._id,
                liked_by: req.user._id,
            });
            comments[i]._doc.isLiked = isLiked ? true : false;
            comments[i]._doc.user_id = {
                ...user._doc,
                isOwner: req.user._id.toString() === comments[i].user_id.toString() ? true : false,


            };
        }



        ControllerResponse(res, 200, comments);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.fetchCommentReply = BigPromise(async (req, res) => {
    try {
        const { commentId } = req.query;
        const allComments = await FeedComments.find({
            parent_comment: commentId,
        }).sort({ createdAt: -1 });
        const comments = allComments.filter(
            (comment) => comment.id.toString() !== commentId.toString());
        for (let i = 0; i < comments.length; i++) {
            const user = await Users.findById(comments[i].user_id,
                {
                    _id: 1,
                    username: 1,
                    profile_pic: 1,
                    occupation: 1,
                }
            );
            const isLiked = await FeedCommetLikes.findOne({
                comment_id: comments[i]._id,
                liked_by: req.user._id,
            });
            comments[i]._doc.isLiked = isLiked ? true : false;
            comments[i]._doc.user_id = {
                ...user._doc,
                isOwner: req.user._id.toString() === comments[i].user_id.toString() ? true : false
            };
        }
        ControllerResponse(res, 200, comments);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});
module.exports.toggleFeedLike = BigPromise(async (req, res) => {
    try {
        const { feedId } = req.body;
        console.log(feedId);
        const likedBy = req.user._id;
        const user = await Users.findById(req.user._id);
        const existingLike = await FeedLikes.findOne({
            feed_id: feedId,
            liked_by: likedBy,
        });

        if (!existingLike) {
            const newLike = new FeedLikes({
                feed_id: feedId,
                liked_by: likedBy,
            });
            await newLike.save();
            // const fcmTokens = await DeviceFCMToken.find({
            //     $and: [
            //         { user_id: feed.user_id },
            //         { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } }
            //     ]
            // }, { fcm_token: 1, user_id: 1 });
            // console.log(fcmTokens);
            // if (fcmTokens.length > 0)
            //     await FirebaseAdminService.sendNotifications({
            //         fcmTokens: fcmTokens.map(
            //             (fcmToken) => fcmToken.fcm_token
            //         ), notification: "New Like", body: user.username + " just liked your feed"
            //     });
        }

        // update feed like count
        const feed = await Feed.findByIdAndUpdate(feedId, {
            $inc: { like_count: existingLike ? -1 : 1 },
        }, { new: true });



        ControllerResponse(res, 200, "Like/Dislike toggled successfully");
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.getLikedFeeds = BigPromise(async (req, res) => {
    try {

        const likedFeeds = await FeedLikes.find({
            liked_by: req.user._id,
        });
        const feedIds = likedFeeds.map((feed) => feed.feed_id);
        const feeds = await Feed.find({
            _id: {
                $in: feedIds,
            },

        }, {
            user_id: 1,
            images: 1,
            is_private: 1,
            allow_comments: 1,
            allow_save: 1,
            created_at: 1,
        });
        for (let i = 0; i < feeds.length; i++) {
            const user = await Users.findById(feeds[i].user_id,
                {
                    _id: 1,
                    username: 1,
                    profile_pic: 1,
                    occupation: 1,
                    email: 1,
                });
            console.log(req.user._id === feeds[i].user_id._id ? true : false);
            feeds[i]._doc.user_id = {
                ...user._doc,
                isOwner: false
            };
        }
        ControllerResponse(res, 200, feeds);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.toggleFeedSave = BigPromise(async (req, res) => {
    try {
        const { feedId } = req.body;
        const savedBy = req.user._id;
        const feed = await Feed.findById(feedId);
        if (!feed) {
            return ErrorHandler(res, 404, "Feed not found");
        }
        const existingSave = await FeedSaves.findOne({
            feed_id: feedId,
            saved_by: savedBy,
        });
        if (existingSave) {
            await FeedSaves.findByIdAndRemove(existingSave._id);
            feed.saved_count--;
            ControllerResponse(res, 200, "Removed Saved");
            return;
        } else {
            const newSavedFeed = new FeedSaves({
                feed_id: feedId,
                saved_by: savedBy,
            });
            await newSavedFeed.save();
            feed.saved_count++;
        }
        await feed.save();
        ControllerResponse(res, 200, "Saved Feed");
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.getSavedFeeds = BigPromise(async (req, res) => {
    try {
        const savedFeeds = await FeedSaves.find({
            saved_by: req.user._id,
        });
        const feedIds = savedFeeds.map((feed) => feed.feed_id);
        const feeds = await Feed.find({
            _id: {
                $in: feedIds,
            },

        }, {
            user_id: 1,
            images: 1,
            is_private: 1,
            allow_comments: 1,
            allow_save: 1,
            created_at: 1,
        });
        for (let i = 0; i < feeds.length; i++) {
            const user = await Users.findById(feeds[i].user_id,
                {
                    _id: 1,
                    username: 1,
                    profile_pic: 1,
                    occupation: 1,
                    email: 1,
                });
            console.log(req.user._id === feeds[i].user_id._id ? true : false);
            feeds[i]._doc.user_id = {
                ...user._doc,
                isOwner: false
            };
        }
        ControllerResponse(res, 200, feeds);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});
module.exports.fetchMentionedUsers = BigPromise(async (req, res) => {
    try {
        const { feedId } = req.query;
        const feed = await Feed.findById(feedId);
        if (!feed) {
            return ErrorHandler(res, 404, "Feed not found");
        }
        const mentions = feed.mentions;
        const users = await Users.find({
            _id: {
                $in: mentions,
            },
        }, {
            _id: 1,
            username: 1,
            profile_pic: 1,
            occupation: 1,
            email: 1,
        });
        for (let i = 0; i < users.length; i++) {
            if (users[i]._id.toString() === req.user._id) {
                users[i]._doc.isOwner = true;
            } else {
                users[i]._doc.isOwner = false;
            }
        }
        ControllerResponse(res, 200, users);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});
module.exports.fetchFeedLikes = BigPromise(async (req, res) => {
    try {
        const { feedId } = req.query;
        const feedLikes = await FeedLikes.find({
            feed_id: feedId
        }
        );
        if (!feedLikes) {
            return ErrorHandler(res, 404, "Feed not found");
        }
        const likes = feedLikes.map((like) => like.liked_by);
        console.log("Likes", feedLikes)
        const users = await Users.find({
            _id: {
                $in: likes,
            },
        }, {
            _id: 1,
            username: 1,
            profile_pic: 1,
            occupation: 1,
            email: 1,
        });
        console.log("users", users)
        for (let i = 0; i < users.length; i++) {
            if (users[i]._id.toString() === req.user._id) {
                users[i]._doc.isOwner = true;
            } else {
                users[i]._doc.isOwner = false;
            }
        }

        ControllerResponse(res, 200, users);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});


module.exports.searchLocation = BigPromise(async (req, res) => {
    try {
        const { query } = req.query;

        const response = await axios
            .get(
                `https://photon.komoot.io/api/?q=${query}&limit=10`
            );
        const data = response.data.features.map((feature) => ({
            name: feature.properties.name,
            type: feature.properties.type,
            country: feature.properties.country,
            state: feature.properties.state,
            geometry: feature.geometry,
        }));
        ControllerResponse(res, 200, data);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.searchHashtags = BigPromise(async (req, res) => {
    try {
        const { query } = req.query;
        const hashtags = await Hashtag.find({
            hashtag: {
                $regex: new RegExp("^" + query, "i")
            },

        }, {
            _id: 1,
            hashtag: 1,
            post_count: 1,
        }).limit(10);
        ControllerResponse(res, 200, hashtags);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.getFeedById = BigPromise(async (req, res) => {
    try {
        const { feedId } = req.query;
        const feed = await Feed.findById(feedId);

        if (!feed) {
            return ErrorHandler(res, 400, "Feed not found");
        }
        if (feed.is_private) {
            const isFollower = await Follow.findOne({
                followed_by: req.user._id,
                followed_to: feed.user_id,
                is_confirmed: true,
            });
            if (!isFollower)
                return ErrorHandler(res, 400, "Feed is private");
        }
        const [tags, location, mentions, isLiked, isSaved, user, commentUsers] = await Promise.all([
            Hashtag.find({ _id: { $in: feed.tags } }),
            Location.findById(feed.location),
            Users.find({ _id: { $in: feed.mentions } }),
            FeedLikes.findOne({ feed_id: feedId, liked_by: req.user._id }),
            FeedSaves.findOne({ feed_id: feedId, saved_by: req.user._id }),
            Users.findById(feed.user_id, { _id: 1, username: 1, profile_pic: 1, occupation: 1, email: 1 }),
            FeedComments.find({ parent_feed: feedId }, {
                _id: 1,
                user_id: 1,

            }).limit(3).sort({ createdAt: -1 }),
        ]);

        for (let i = 0; i < commentUsers.length; i++) {
            const user = await Users.findById(commentUsers[i].user_id,
                {
                    _id: 1,
                    profile_pic: 1,
                });
            commentUsers[i]._doc = {
                ...user._doc,
                isOwner: req.user._id.toString() === commentUsers[i].user_id.toString() ? true : false,
            };
        }
        user._doc.isOwner = req.user._id.toString() === feed.user_id.toString() ? true : false;
        const data = {
            _id: feed._id,
            images: feed.images,
            mentions: mentions.map((mention) => mention.id),
            tags: tags.map((tag) => tag.hashtag),
            location: location != null ? location.name : null,
            auto_enhanced: feed.auto_enhanced,
            caption: feed.caption,
            like_count: feed.like_count,
            comment_count: feed.comment_count,
            is_private: feed.is_private,
            allow_comments: feed.allow_comments,
            allow_save: feed.allow_save,
            saved_count: feed.saved_count,
            createdAt: feed.createdAt,
            updatedAt: feed.updatedAt,
            isLiked: isLiked ? true : false,
            isSaved: isSaved ? true : false,
            user: user,
            commentUsers: commentUsers,
        };


        ControllerResponse(res, 200, data);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

module.exports.fetchTrendingFeeds = BigPromise(async (req, res) => {


    try {
        const { _id } = req.user;


        // Fetch threads with comments
        const feedsWithUserDetails = await Feed.aggregate([
            {
                $match:
                {
                    is_private: false,

                },

            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $lookup: {
                    from: "feedcomments",
                    let: { parentFeedId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $and: [{ $eq: ["$$parentFeedId", "$parent_feed"] }, { $ne: ["$$parentFeedId", "$_id"] }] },
                            }

                        },
                        {
                            $sort: { createdAt: -1 },
                        },
                        {
                            $limit: 3,
                        },
                    ],
                    as: "latestComments",
                },
            },
        ]);
        // Fetch comment users' details and map by ID
        const commentUserIds = new Set();
        feedsWithUserDetails.forEach((feed) => {
            feed.latestComments.forEach((comment) => {
                commentUserIds.add(comment.user_id.toString());
            });
        });

        const commentUsers = await Users.find({ _id: { $in: Array.from(commentUserIds) } }, { _id: 1, profile_pic: 1 });

        const commentUserMap = new Map(commentUsers.map((user) => [user._id.toString(), user]));

        // Fetch user details for threads
        const feedUserIds = feedsWithUserDetails.map((feed) => feed.user_id);

        const feedIds = feedsWithUserDetails.map((feed) => feed._id);
        let alltags = [];

        feedsWithUserDetails.map(async (feed) => {
            if (feed.tags.length > 0)
                alltags = alltags.concat(feed.tags);
        });

        const [users, feedLikes, saves, tags, location] = await Promise.all([
            Users.find({ _id: { $in: feedUserIds } }, { _id: 1, username: 1, occupation: 1, profile_pic: 1 }),
            FeedLikes.find({ liked_by: req.user._id, feed_id: { $in: feedIds } }),
            FeedSaves.find({ saved_by: req.user._id, feed_id: { $in: feedIds } }),
            Hashtag.find({ _id: { $in: alltags } }),
            Location.find({ _id: { $in: feedsWithUserDetails.map(feed => feed.location) } }),
        ]);

        const feedLikesMap = new Map(feedLikes.map((like) => [like.feed_id.toString(), true]));
        const savedFeedsMap = new Map(saves.map((savedFeed) => [savedFeed.feed_id.toString(), true]));
        const userMap = new Map(users.map((user) => [user._id.toString(), user]));
        const tagsMap = new Map(tags.map((tag) => [tag._id.toString(), tag.hashtag]));
        const locationMap = new Map(location.map((loc) => [loc._id.toString(), loc.name]));

        console.log(saves);
        // Process feeds and add necessary details
        const trendingFeeds = feedsWithUserDetails.map((feed) => {
            feed.isLiked = feedLikesMap.get(feed._id.toString()) || false;
            feed.isSaved = savedFeedsMap.get(feed._id.toString()) || false;
            const user = userMap.get(feed.user_id.toString());
            feed.user = { ...user.toObject(), isOwner: user._id.toString() === _id };
            feed.tags = feed.tags.map(tag => tagsMap.get(tag.toString()));
            feed.location = feed.location == null ? null : locationMap.get(feed.location.toString());

            feed.commentUsers = feed.latestComments.map((comment) => ({
                _id: comment.user_id,
                profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
            }));
            delete feed.user_id;
            delete feed.latestComments;
            return feed;
        });

        ControllerResponse(res, 200, trendingFeeds);
    } catch (err) {
        console.log(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});