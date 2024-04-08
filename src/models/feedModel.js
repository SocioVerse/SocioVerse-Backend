const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const feedSchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        images: [
            {
                type: String,
                required: true,
            }
        ],
        mentions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "users",
            }
        ],
        tags: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "hashtags",
            }
        ],
        location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "locations",
        },
        auto_enhanced: {
            type: Boolean,
            default: false,
        },
        caption: {
            type: String,
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
        allow_comments: {
            type: Boolean,
            default: true,
        },
        allow_save: {
            type: Boolean,
            default: true,
        },
        saved_count: {
            type: Number,
            default: 0,
        },

    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("feeds", feedSchema);