const {
    ControllerResponse,
    ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Thread = require("../models/threadsModel");
const Feed = require("../models/feedModel");
const Story = require("../models/storyModel");
const Report = require("../models/reportModel");
const { default: mongoose } = require("mongoose");
const DeviceFCMToken = require("../models/deviceFcmTocken");

module.exports.addReport = BigPromise(async (req, res) => {
    try {
        const { reportType, user_id, feed_id, thread_id, story_id, reason } = req.body;

        const newReport = new Report({
            reportType,
            user_id,
            feed_id,
            thread_id,
            story_id,
            reported_by: req.user._id,
            reason,
        });
        await newReport.save();

        ControllerResponse(res, 200, "Report Added Successfully");
    } catch (err) {
        console.log(err);
        ErrorHandler(res, 500, "Internal Server Error");
    }
});