const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roomSchema = new Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
            default: function () {
                return this._id;
            },
        },
        groupName: {
            type: String,
        },
        groupDesc: {
            type: String,
        },
        groupPic: {
            type: String,
        },
        isGroup: {
            type: Boolean,
            default: false,
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "users", // Reference to the user schema
            },
        ],
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",

        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Room", roomSchema);
