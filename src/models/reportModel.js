const mongoose = require("mongoose");
const ReportSchema = new mongoose.Schema({
    reportType: {
        type: String,
        required: true,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
    },
    feed_id: {
        type: mongoose.Schema.Types.ObjectId,
    },
    thread_id: {
        type: mongoose.Schema.Types.ObjectId,
    },
    story_id: {
        type: mongoose.Schema.Types.ObjectId,
    },
    reported_by: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
})
module.exports = mongoose.model('reports', ReportSchema)