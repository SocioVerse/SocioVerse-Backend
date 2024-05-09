const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
    {
        message: {
            type: String,
        },
        soft_delete: {
            type: Boolean,
            default: false,
        },
        room_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Rooms",
            required: true,
        },
        image: {
            type: String,
        },
        thread: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "threads",
        },
        seenBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "users",
                default: [],
            },
        ],
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Message", messageSchema);
