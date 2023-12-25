const mongoose = require("mongoose");

const DeviceFCMToken = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userSchema',
        required: true
    },
    fcm_token: {
        type: String,
        required: true
    },

}, {
    timestamps: true,

})

module.exports = mongoose.model('DeviceFCMToken', DeviceFCMToken)