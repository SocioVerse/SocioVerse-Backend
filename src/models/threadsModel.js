const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const threadsSchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "threadsSchema",
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        images: [
            {
                type: String,
                trim: true,
                default: [],
            }
        ],
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "threadsSchema",
            }
        ],
        repost_by: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "threadsSchema",
            }
        ],
        is_private: {
            type: boolean,
            default: false,
        },
        isBase: {
            type: boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("threads", threadsSchema);