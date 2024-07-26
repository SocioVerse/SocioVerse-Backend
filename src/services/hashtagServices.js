const {
    ControllerResponse,
    ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Feed = require("../models/feedModel");

module.exports.fetchHashtagsFeeds = BigPromise(async (req, res) => {
    try {
        const { tagId, isRecent } = req.query;
        const feeds = await Feed.find({
            tags: { $in: [tagId] },
            is_private: false,
        }, {
            user_id: 1,
            images: 1,
            is_private: 1,
            allow_comments: 1,
            allow_save: 1,
            created_at: 1,
        });
        if (isRecent) {
            feeds.sort((a, b) => b.created_at - a.created_at);
        } else {
            feeds.sort((a, b) => b.like_count - a.like_count);
        }
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