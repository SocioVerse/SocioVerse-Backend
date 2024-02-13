const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const feedLikesSchema = new Schema(
    {
        feed_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "feeds",
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

module.exports = mongoose.model("feedLikes", feedLikesSchema);