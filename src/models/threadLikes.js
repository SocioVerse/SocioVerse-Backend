const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const threadLikesSchema = new Schema(
    {
        thread_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "threads",
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

module.exports = mongoose.model("threadLikes", threadLikesSchema);