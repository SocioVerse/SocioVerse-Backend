const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Thread = require("../models/threadsModel");
const Follow = require("../models/follows");
const Comments = require("../models/commentModel");

module.exports.createThread = BigPromise(async (req, res) => {
  console.log(req.user);
  try {
    const { content, images, is_private, isBase, comments } = req.body;
    const newThread = new Thread({
      user_id: req.user._id,
      content,
      images,
      is_private: is_private || false,
      isBase: isBase || true,
    });
    await newThread.save();
    for (let i = 0; i < comments.length; i++) {
      const newComment = new Thread({
        user_id: req.user._id,
        content: comments[i].content,
        images: comments[i].images,
        is_private: newThread.is_private,
        isBase: false,
      });
      await newComment.save();
      new Comments(
        {
          linked_thread: newComment._id,
          base_thread: newThread._id,
        }
      ).save();

    }
    ControllerResponse(res, 200, {
      message: "Thread created successfully",
      thread: newThread,

    });
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

    ControllerResponse(res, 200, thread);

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
    if (!thread) {
      return ErrorHandler(res, 404, "Thread does not exist");
    }
    ControllerResponse(res, 200, "Thread Deleted Successfully");
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.createFollowRequest = BigPromise(async (req, res) => {
  try {
    const requestingUserId = req.user._id;
    const { targetUserId } = req.query;

    const existingRequest = await Follow.findOne({
      followed_by: requestingUserId,
      followed_to: targetUserId,
    });

    if (existingRequest) {
      return ErrorHandler(res, 404, "Follow Request Already Exists")
    }

    // Create a new follow request
    const followRequest = new Follow({
      followed_by: requestingUserId,
      followed_to: targetUserId,
      is_confirmed: false,
    });

    await followRequest.save();
    ControllerResponse(res, 200, "Follow Request Sent Succesfully");
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.confirmFollowRequest = BigPromise(async (req, res) => {
  try {
    const requestingUserId = req.user._id;
    const { targetUserId } = req.query;

    const Request = await Follow.findOne({
      followed_by: targetUserId,
      followed_to: requestingUserId,
    });

    if (Request) {
      Request.is_confirmed = true;
    }
    else {
      return Error(res, 404, "Follow Request Not Found");
    }
    await Request.save();
    ControllerResponse(res, 200, "Follow Request Accepted");
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.deleteFollowRequest = BigPromise(async (req, res) => {
  try {
    const requestingUserId = req.user._id;
    const { targetUserId } = req.query;

    const existingRequest = await Follow.findOne({
      followed_by: targetUserId,
      followed_to: requestingUserId,
    });

    if (existingRequest) {
      await existingRequest.deleteOne({
        followed_by: targetUserId,
        followed_to: requestingUserId,
      });
      ControllerResponse(res, 200, "Follow Request Deleted Successfully");
    } else {
      ErrorHandler(res, 404, "Follow Request Not Found");
    }
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchFollowers = BigPromise(async (req, res) => {
  try {
    const { userId } = req.query;

    const followers = await Follow.find({ followed_to: userId, is_confirmed: true });

    ControllerResponse(res, 200, followers);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

module.exports.fetchFollowing = BigPromise(async (req, res) => {
  try {
    const { userId } = req.query;

    const following = await Follow.find({ followed_by: userId, is_confirmed: true });

    ControllerResponse(res, 200, following);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

module.exports.createComment = BigPromise(async (req, res) => {
  try {
    const isBaseThreadPrivate = await Thread.findById({
      _id: req.body.threadId,
      isBase: true,
    },
    );
    console.log(isBaseThreadPrivate);
    const { threadId, content, images } = req.body;
    const comment = await Thread({
      user_id: req.user._id,
      content,
      images,
      is_private: isBaseThreadPrivate.is_private,
      isBase: false,

    }).save();
    await Comments({
      linked_thread: comment._id,
      base_thread: threadId,
    }).save();
    ControllerResponse(res, 200, {
      message: "Comment created successfully",
      comment,

    });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.updateComment = BigPromise(async (req, res) => {
  try {
    const { commentId, content, images } = req.body;
    const comment = await Thread.findByIdAndUpdate(commentId, {
      content,
      images,
    });

    ControllerResponse(res, 200, {
      message: "Comment updated successfully",
      comment,

    });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});