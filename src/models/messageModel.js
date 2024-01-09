const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
    {
        message: {
            type: String,
        },
        room_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "roomSchema",
            required: true,
        },
        image: {
            type: String,
        },
        thread: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "threadsSchema",
        },
        seenBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "userSchema",
                default: [],
            },
        ],
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userSchema",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Message", messageSchema);
