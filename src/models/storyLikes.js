const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const storyLikeSchema = new Schema(
    {
        liked_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        story_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "stories",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("storyLikes", storyLikeSchema);