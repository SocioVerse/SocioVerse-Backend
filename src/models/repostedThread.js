const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const repostedThreadSchema = new Schema(
    {
        thread_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "threads",
            required: true,
        },
        reposted_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("repostedThreads", repostedThreadSchema);