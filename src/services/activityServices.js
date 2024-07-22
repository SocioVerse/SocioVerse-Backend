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
const { forEach } = require("mongoose/lib/helpers/specialProperties");
const ThreadLikes = require("../models/threadLikes");
const Thread = require("../models/threadsModel");
const StoryLikes = require("../models/storyLikes");
const Story = require("../models/storyModel");
// feedsActivity
module.exports.feedsActivity = BigPromise(async (req, res) => {
    try {

        const { type } = req.query;
        const user_id = req.user._id;
        const allUserFeeds =
            type === 'likes' ? await Feed.find({
                user_id: user_id,
                like_count: { $gt: 0 }
            }, { images: 1, createdAt: 1, updatedAt: 1, like_count: 1, comment_count: 1 }) :
                await Feed.find({
                    user_id: user_id,
                    comment_count: { $gt: 0 }
                }, { images: 1, createdAt: 1, updatedAt: 1, like_count: 1, comment_count: 1 })
        console.log(user_id, allUserFeeds);
        if (type === 'likes') {
            for (const feed of allUserFeeds) {
                feed._doc.latestLike = await FeedLikes.findOne({
                    feed_id: feed._id,
                    user_id: { $ne: user_id }
                }).sort({ createdAt: -1 })
                    .populate('liked_by', 'username profile_pic');
            }
            // remove latest like is null from the array
            const allUserFeedsLikes = allUserFeeds.filter(feed => feed._doc.latestLike !== null);
            allUserFeedsLikes.sort((a, b) => {
                return b._doc.latestLike.createdAt - a._doc.latestLike.createdAt;
            });
            return ControllerResponse(res, 200, allUserFeedsLikes);
        } else {
            for (const feed of allUserFeeds) {
                feed._doc.latestComment = await FeedComments.findOne({
                    parent_feed: feed._id,
                    user_id: { $ne: user_id }
                },
                    {
                        feed_id: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    }).sort({ createdAt: -1 })
                    .populate('user_id', 'username profile_pic');
            }
            // remove latest comment is null from the array

            const allUserFeedsComments = allUserFeeds.filter(feed => feed._doc.latestComment !== null);
            allUserFeedsComments.sort((a, b) => {
                return b._doc.latestComment.createdAt - a._doc.latestComment.createdAt;
            });
            return ControllerResponse(res, 200, allUserFeedsComments);
        }



    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

// threadsActivity

module.exports.threadsActivity = BigPromise(async (req, res) => {
    try {
        const { type } = req.query;
        const user_id = req.user._id;
        const allUserThreads =
            type === 'likes' ? await Thread.find({
                user_id: user_id,
                like_count: { $gt: 0 },
                isBase: true
            }, { _id: 1, createdAt: 1, updatedAt: 1, like_count: 1, comment_count: 1, images: 1, content: 1 }) :
                await Thread.find({
                    user_id: user_id,
                    comment_count: { $gt: 0 },
                    isBase: true
                }, { _id: 1, createdAt: 1, updatedAt: 1, like_count: 1, comment_count: 1, images: 1, content: 1 })
        console.log(user_id, allUserThreads);
        if (type === 'likes') {
            for (const thread of allUserThreads) {
                thread._doc.latestLike = await ThreadLikes.findOne({
                    thread_id: thread._id,
                    liked_by: { $ne: user_id }
                }).sort({ createdAt: -1 })
                    .populate('liked_by', 'username profile_pic');

            }
            // remove latest like is null from the array
            const allUserThreadsLikes = allUserThreads.filter(thread => thread._doc.latestLike !== null);
            allUserThreadsLikes.sort((a, b) => {
                return b._doc.latestLike.createdAt - a._doc.latestLike.createdAt;
            });
            return ControllerResponse(res, 200, allUserThreadsLikes);
        } else {
            for (const thread of allUserThreads) {
                thread._doc.latestComment = await Thread.findOne({
                    parent_thread: thread._id,
                    _id: { $ne: thread._id },
                    user_id: { $ne: user_id }
                },
                    {
                        _id: 1,
                        user_id: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    }).sort({ createdAt: -1 })
                    .populate('user_id', 'username profile_pic');
            }
            // remove latest comment is null from the array
            const allUserThreadsComments = allUserThreads.filter(thread => thread._doc.latestComment !== null);
            allUserThreadsComments.sort((a, b) => {
                return b._doc.latestComment.createdAt - a._doc.latestComment.createdAt;
            });
            return ControllerResponse(res, 200, allUserThreadsComments);
        }
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

// feed comments
module.exports.feedCommentsActivity = BigPromise(async (req, res) => {
    try {
        const { type } = req.query;
        const user_id = req.user._id;
        const allUserFeedComments = type === 'likes' ? await FeedComments.find({
            user_id: user_id,
            like_count: { $gt: 0 }
        }).populate('parent_feed', 'images createdAt updatedAt like_count comment_count')
            : await FeedComments.find({
                user_id: user_id,
                comment_count: { $gt: 0 }
            }).populate('parent_feed', 'images createdAt updatedAt like_count comment_count');

        if (type === 'likes') {
            for (const comment of allUserFeedComments) {
                comment._doc.latestLike = await FeedCommetLikes.findOne({
                    comment_id: comment._id,
                    liked_by: { $ne: user_id }
                }).sort({ createdAt: -1 })
                    .populate('liked_by', 'username profile_pic');
            }
            // remove latest like is null from the array
            const allUserFeedCommentsLikes = allUserFeedComments.filter(comment => comment._doc.latestLike !== null);
            allUserFeedCommentsLikes.sort((a, b) => {
                return b._doc.latestLike.createdAt - a._doc.latestLike.createdAt;
            });
            return ControllerResponse(res, 200, allUserFeedCommentsLikes);
        } else {
            for (const comment of allUserFeedComments) {
                comment._doc.latestComment = await FeedComments.findOne({
                    parent_comment: comment._id,
                    user_id: { $ne: user_id }
                },
                    {
                        _id: 1,
                        user_id: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    }).sort({ createdAt: -1 })
                    .populate('user_id', 'username profile_pic');
            }
            // remove latest comment is null from the array
            const allUserFeedCommentsComments = allUserFeedComments.filter(comment => comment._doc.latestComment !== null);
            allUserFeedCommentsComments.sort((a, b) => {
                return b._doc.latestComment.createdAt - a._doc.latestComment.createdAt;
            });
            return ControllerResponse(res, 200, allUserFeedCommentsComments);
        }
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

// thread comments

module.exports.threadCommentsActivity = BigPromise(async (req, res) => {
    try {
        const { type } = req.query;
        const user_id = req.user._id;
        const allUserThreadComments = type === 'likes' ? await Thread.find({
            user_id: user_id,
            isBase: false,
            like_count: { $gt: 0 }
        }).populate('parent_thread', '_id createdAt updatedAt like_count comment_count')
            : await Thread.find({
                user_id: user_id,
                comment_count: { $gt: 0 },
                isBase: false
            }).populate('parent_thread', '_id createdAt updatedAt like_count comment_count');

        if (type === 'likes') {
            for (const comment of allUserThreadComments) {
                comment._doc.latestLike = await ThreadLikes.findOne({
                    thread_id: comment._id,
                    liked_by: { $ne: user_id }
                }).sort({ createdAt: -1 })
                    .populate('liked_by', 'username profile_pic');
            }
            // remove latest like is null from the array
            const allUserThreadCommentsLikes = allUserThreadComments.filter(thread => thread._doc.latestLike !== null);
            allUserThreadCommentsLikes.sort((a, b) => {
                return b._doc.latestLike.createdAt - a._doc.latestLike.createdAt;
            });
            return ControllerResponse(res, 200, allUserThreadCommentsLikes);
        } else {
            for (const comment of allUserThreadComments) {
                comment._doc.latestComment = await Thread.findOne({
                    parent_thread: comment._id,
                    user_id: { $ne: user_id }
                },
                    {
                        _id: 1,
                        user_id: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    }).sort({ createdAt: -1 })
                    .populate('user_id', 'username profile_pic');
            }
            // remove latest comment is null from the array
            const allUserThreadCommentsComments = allUserThreadComments.filter(thread => thread._doc.latestComment !== null);
            allUserThreadCommentsComments.sort((a, b) => {
                return b._doc.latestComment.createdAt - a._doc.latestComment.createdAt;
            });
            return ControllerResponse(res, 200, allUserThreadCommentsComments);
        }
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

// story likes
module.exports.storyLikesActivity = BigPromise(async (req, res) => {
    try {
        const user_id = req.user._id;
        const allUserStories = await Story.find({
            user_id: user_id,
            like_count: { $gt: 0 }
        }, { images: 1, createdAt: 1, updatedAt: 1, like_count: 1, comment_count: 1, image: 1 })

        for (const story of allUserStories) {
            story._doc.latestLike = await StoryLikes.findOne({
                story_id: story._id,
                liked_by: { $ne: user_id }
            }).sort({ createdAt: -1 })
                .populate('liked_by', 'username profile_pic');
        }
        // remove latest like is null from the array
        const allUserStoriesLikes = allUserStories.filter(story => story._doc.latestLike !== null);
        allUserStoriesLikes.sort((a, b) => {
            return b._doc.latestLike.createdAt - a._doc.latestLike.createdAt;
        });
        return ControllerResponse(res, 200, allUserStoriesLikes);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});

// mentions

module.exports.mentionsActivity = BigPromise(async (req, res) => {
    try {
        const user_id = req.user._id;
        const allUserMentions = await Feed.find({
            mentions: user_id,
            user_id: { $ne: user_id }
        },
            {
                images: 1,
                createdAt: 1,
                updatedAt: 1,
                like_count: 1,
                comment_count: 1,
            }).populate('user_id', 'username profile_pic');
        return ControllerResponse(res, 200, allUserMentions);
    } catch (err) {
        console.error(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
}
);