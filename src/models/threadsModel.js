const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const threadsSchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userSchema",
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