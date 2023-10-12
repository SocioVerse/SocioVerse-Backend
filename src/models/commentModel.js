const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const commentSchema = new Schema({
    base_thread: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"threadsSchema",
        required: true,
    },
    linked_thread: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"threadsSchema",
        required: true,
    }
}, {
    timestamps: true
});
module.exports = mongoose.model('comment', commentSchema);