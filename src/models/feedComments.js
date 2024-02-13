const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const feedCommentsSchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        parent_comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "feedComments",
            required: true,
            default: function () {
                return this._id;
            },
        },
        parent_feed: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "feeds",
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        like_count: {
            type: Number,
            default: 0,
        },
        comment_count: {
            type: Number,
            default: 0,
        },
        is_private: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("feedComments", feedCommentsSchema);
