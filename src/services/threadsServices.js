const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Thread = require("../models/threadsModel");
const Follow =require("../models/follows");

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
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.readThread = BigPromise(async (req, res) => {
  try {
    const thread = await Thread.findById(req.query.threadId);
    
    if (!thread) {
      return ErrorHandler(res, 404, "Thread not found");
    }

    ControllerResponse(res, 200, "Thread retrieved successfully", thread);
    
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.updateThread = BigPromise(async (req, res) => {
  try {
    const threadId = req.query.threadId;
    const { content, images, is_private, isBase } = req.body;
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return ErrorHandler(res, 404, "Thread not found");
    }
    if (thread.user_id != req.user._id) {
      return ErrorHandler(res, 400, "UnAuthorized");
    }
    if (content) {
      thread.content = content;
    }
    if (images) {
      thread.images = images;
    }
    if (is_private) {
      thread.is_private = is_private;
    }
    if (isBase) {
      thread.isBase = isBase;
    }
    await thread.save();
    ControllerResponse(res, 200, "Thread updated successfully");
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.deleteThread = BigPromise(async (req, res) => {
  try {
    const thread = await Thread.findByIdAndRemove(req.query.threadId);
 
    if(!thread){
      return ErrorHandler(res, 404, "Thread not found");
    }
    ControllerResponse(res, 200, "Thread Deleted Successfully");

  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchFollowers = BigPromise(async (req, res) => {
  try {
    const userId = req.query.userId;

    const followers = await Follow.find({ followed_to: userId, is_confirmed: true });

    if (followers) {
      ControllerResponse(res, 200, followers);
    } else {

      ControllerResponse(res, 404, 'No followers found');
    }
  } catch (error) {
    console.error(error);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

module.exports.fetchFollowing = BigPromise(async (req, res) => {
  try {
    const userId = req.query.userId;

    const following = await Follow.find({ followed_by: userId, is_confirmed: true });

    if (following) {
      ControllerResponse(res, 200, following);
    } else {

      ControllerResponse(res, 404, 'No following found');
    }
  } catch (error) {
    console.error(error);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

