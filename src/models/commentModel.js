const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
    base_thread: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    linked_thread: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    }
}, {
    timestamps: true
});
module.exports = mongoose.model('comment', commentSchema);