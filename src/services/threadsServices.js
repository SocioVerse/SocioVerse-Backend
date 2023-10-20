const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Thread = require("../models/threadsModel");

module.exports.createThread = BigPromise(async (req, res) => {
  try {
    const user = await Users.findById(req.user);
    if (!user) {
      return ErrorHandler(res, 403, "Seller not found");
    }
    const { content, images, is_private, isBase } = req.body;
    const newThread = new Thread({
      user_id: user._id,
      content,
      images,
      is_private: is_private || false,
      isBase: isBase || true,
    });
    await newThread.save();
    ControllerResponse(res, 200, "Thread created successfully");
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
