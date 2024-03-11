const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const feedCommentLikeModel = new Schema(
    {
        comment_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "feedComments",
            required: true,
        },
        liked_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        }

    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("feedCommentLikes", feedCommentLikeModel);