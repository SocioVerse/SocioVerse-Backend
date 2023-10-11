const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const followsSchema = new Schema(
    {
        followed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userSchema",
            required: true,
        },
        followed_to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userSchema",
            required: true,
        },
        is_confirmed: {
            type: boolean,
            default: false,
        }

    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("follows", followsSchema);