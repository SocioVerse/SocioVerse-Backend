const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const repostedThreadSchema = new Schema(
    {
        thread_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "threadsSchema",
            required: true,
        },
        reposte_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userSchema",
            required: true,
        }
        
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("repostedThreads", repostedThreadSchema);