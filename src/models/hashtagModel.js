const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const hashtagSchema = new Schema(
    {

        hashtag: {
            type: String,
            required: true,
        },
        post_count: {
            type: Number,
            default: 0,
        },

    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("hashtags", hashtagSchema);