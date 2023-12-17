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

      await Users.findByIdAndUpdate(req.user._id, {
        $inc: { post_count: 1 },
      });
      await newComment.save();
    }
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
    const { threadId, content, images } = req.body;
    //Increment comment count of parent thread
    await Thread.findByIdAndUpdate(threadId, {
      $inc: { comment_count: 1 },
    });
    const comment = await Thread({
      user_id: req.user._id,
      parent_thread: threadId,
      content,
      images,
      is_private: isBaseThreadPrivate.is_private,
      isBase: false,
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
module.exports.readCommentReplies = BigPromise(async (req, res) => {
  try {
    const { commentId } = req.query;
    const parentComment = await Thread.findById(commentId);
    if (!parentComment) {
      return ErrorHandler(res, 404, "Parent Comment not found");
    }
    const replies = await Thread.find({ parent_thread: commentId });

    const detailedReplies = await Promise.all(
      replies.map(async (reply) => {
        const user = await Users.findById(
          reply.user_id,
          "username occupation profile_pic"
        );
        const isLiked = await ThreadLikes.findOne({
          thread_id: reply._id,
          liked_by: req.user._id,
        });
        return {
          commentId: reply._id,
          content: reply.content,
          images: reply.images,
          username: user.username,
          occupation: user.occupation,
          userProfile: user.profile_pic,
          likeCount: reply.like_count,
          isLiked: !!isLiked,
          commentCount: reply.comment_count,
          userId: reply.user_id,
          createdAt: reply.createdAt,
        };
      })
    );
    ControllerResponse(res, 200, { parentComment, comments: detailedReplies });
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
