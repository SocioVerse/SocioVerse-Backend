const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const storySchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        image:
        {
            type: String,
            trim: true,
            required: true,
        },
        view_count: {

            type: Number,
            default: 0,

        },




    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("stories", storySchema);