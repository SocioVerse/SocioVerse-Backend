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


// Create a unique compound index on feed_id and liked_by
feedLikesSchema.index({ feed_id: 1, liked_by: 1 }, { unique: true });


module.exports = mongoose.model("feedLikes", feedLikesSchema);