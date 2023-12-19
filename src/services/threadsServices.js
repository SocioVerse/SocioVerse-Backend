const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Thread = require("../models/threadsModel");
const Follow = require("../models/follows");
const RepostedThread = require("../models/repostedThread");
const ThreadLikes = require("../models/threadLikes");
const { default: mongoose } = require("mongoose");

//Helper Functions

const deleteCommentsRecursively = async (threadId) => {
  const comments = await Thread.find({
    _id: { $ne: threadId },
    parent_thread: threadId,
  });
  for (let i = 0; i < comments.length; i++) {
    await deleteCommentsRecursively(comments[i]._id);
    await Thread.deleteOne({ _id: comments[i]._id });
  }
};

//Service functions
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
      comment_count: comments.length,
    });
    await newThread.save();
    for (let i = 0; i < comments.length; i++) {
      const newComment = new Thread({
        user_id: req.user._id,
        parent_thread: newThread._id,
        content: comments[i].content,
        images: comments[i].images,
        is_private: newThread.is_private,
        isBase: false,
      });

      
      await newComment.save();
    }await Users.findByIdAndUpdate(req.user._id, {
      $inc: { post_count: 1 },
    });
    ControllerResponse(res, 200, {
      message: "Thread created successfully",
      thread: newThread,
    });
  } catch (err) {
    console.error(err);
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
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.updateThread = BigPromise(async (req, res) => {
  try {
    const threadId = req.body.threadId;
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
    const { threadId } = req.query;
    const baseThread = await Thread.findById(threadId);
    await Thread.findByIdAndUpdate(baseThread.parent_thread, {
      $inc: { comment_count: -1 },
    });
    if (!baseThread) {
      return ErrorHandler(res, 404, "Thread does not exist");
    }
    await deleteCommentsRecursively(threadId);
    await Thread.deleteOne({ _id: threadId });
    ControllerResponse(
      res,
      200,
      "Thread and its comments deleted successfully"
    );
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.createComment = BigPromise(async (req, res) => {
  try {
    const isBaseThreadPrivate = await Thread.findById({
      _id: req.body.threadId,
      isBase: true,
    });
    console.log(isBaseThreadPrivate);
    await Thread.findByIdAndUpdate(req.body.threadId, {
      $inc: { comment_count: 1 },
    });
    const {threadId, content, images, comments } = req.body;
    const newThread = new Thread({
      user_id: req.user._id,
      content,
      parent_thread: threadId,
      images,
      is_private: false,
      isBase: false,
      comment_count: comments.length,
    });
    await newThread.save();
    for (let i = 0; i < comments.length; i++) {
      const newComment = new Thread({
        user_id: req.user._id,
        parent_thread: newThread._id,
        content: comments[i].content,
        images: comments[i].images,
        is_private: newThread.is_private,
        isBase: false,
      });
      await newComment.save();
    }
    
    ControllerResponse(res, 200, {
      message: "Comment created successfully",
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
module.exports.readCommentReplies = BigPromise(async (req, res) => {
  try {
    const { commentId } = req.query;
    const parentComment = await Thread.findById(commentId);
    if (!parentComment) {
      return ErrorHandler(res, 404, "Parent Comment not found");
    }
    // const replies = await Thread.find({ parent_thread: commentId });

    // const detailedReplies = await Promise.all(
    //   replies.map(async (reply) => {
    //     const user = await Users.findById(
    //       reply.user_id,
    //       "username occupation profile_pic"
    //     );
    //     const isLiked = await ThreadLikes.findOne({
    //       thread_id: reply._id,
    //       liked_by: req.user._id,
    //     });
    //     return {
    //       ...reply._doc,
    //       user,
    //       isLiked: !!isLiked,
    //     };
    //   })
    // );
    // ControllerResponse(res, 200, detailedReplies );
    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: {
          parent_thread: new mongoose.Types.ObjectId(commentId),
          _id: { $ne: new mongoose.Types.ObjectId(commentId) },
        
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: "threads",
          let: { parentThreadId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $and: [{ $eq: ["$$parentThreadId", "$parent_thread"] }, { $ne: ["$$parentThreadId", "$_id"] }] },
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $limit: 3,
            },
          ],
          as: "latestComments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "latestComments.user_id",
          foreignField: "_id",
          as: "commentUsers",
        },
      },
      {
        $addFields: {
          commentUsers: {
            $map: {
              input: "$commentUsers",
              as: "commentUser",
              in: {
                _id: "$$commentUser._id",
                profile_pic: "$$commentUser.profile_pic",
              },
            },
          },
        },
      },
    ]);

    // Add no of comments for each thread
    for (let i = 0; i < threadsWithUserDetails.length; i++) {
      const isLiked = await ThreadLikes.findOne({
        thread_id: threadsWithUserDetails[i]._id,
        liked_by: req.user._id,
      });
      threadsWithUserDetails[i].isLiked = isLiked ? true : false;
    }

    // Array of user IDs from threads
    const threadUserIds = threadsWithUserDetails.map((thread) => thread.user_id);

    // Aggregation to fetch user details for the users associated with the threads
    const users = await Users.aggregate([
      {
        $match: {
          _id: { $in: threadUserIds },
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          occupation: 1,
          profile_pic: 1,
        },
      },
    ]);

    // Add user details with each thread
    threadsWithUserDetails.forEach((thread) => {
      const user = users.find((user) => user._id.toString() === thread.user_id.toString());
      delete thread.user_id;
      delete thread.latestComments;
      thread.user = user;
    });

    console.log(threadsWithUserDetails);
    ControllerResponse(res, 200, threadsWithUserDetails);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchRepostedUsers = BigPromise(async (req, res) => {
  try {
    const { threadId } = req.query;
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }
    const reposts = await RepostedThread.find({ thread_id: threadId });
    const repostedUserIds = reposts.map((repost) => repost.reposted_by);
    const repostedUsers = await Users.find(
      { _id: { $in: repostedUserIds } },
      "username"
    );

    ControllerResponse(res, 200, repostedUsers);
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.toggleThreadLike = BigPromise(async (req, res) => {
  try {
    const { threadId } = req.body;
    console.log(threadId);
    const likedBy = req.user._id;

    const existingLike = await ThreadLikes.findOne({
      thread_id: threadId,
      liked_by: likedBy,
    });
    const thread = await Thread.findById(threadId);

    if (existingLike) {
      await ThreadLikes.findByIdAndRemove(existingLike._id);
      thread.like_count--;
    } else {
      const newLike = new ThreadLikes({
        thread_id: threadId,
        liked_by: likedBy,
      });
      await newLike.save();
      thread.like_count++;
    }

    await thread.save();

    ControllerResponse(res, 200, "Like/Dislike toggled successfully");
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
