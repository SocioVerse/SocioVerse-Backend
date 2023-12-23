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
const ThreadSaves = require("../models/threadSaves");
const { default: mongoose } = require("mongoose");

//Helper Functions

const deleteCommentsRecursively = async (threadId) => {
  const comments = await Thread.find({ parent_thread: threadId }, '_id');

  const commentIds = comments.map(comment => comment._id);

  for (const comment of comments) {
    await deleteCommentsRecursively(comment._id);
  }

  if (commentIds.length > 0) {
    await Thread.deleteMany({ _id: { $in: commentIds } });
    await ThreadLikes.deleteMany({ thread_id: { $in: commentIds } });
    await RepostedThread.deleteMany({ thread_id: { $in: commentIds } });
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
    }
    await Users.findByIdAndUpdate(req.user._id, {
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
    const { threadId } = req.body;
    const baseThread = await Thread.findById(new mongoose.Types.ObjectId(threadId));
    if (!baseThread) {
      return ErrorHandler(res, 404, "Thread does not exist");
    }
    await deleteCommentsRecursively(new mongoose.Types.ObjectId(threadId));
    await Thread.deleteOne({ _id: new mongoose.Types.ObjectId(threadId) });
    if (baseThread.isBase) {
      await RepostedThread.deleteMany({ thread_id: threadId });
    }
    await Users.findByIdAndUpdate(req.user._id, {
      $inc: { post_count: -1 },
    });
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
    const { threadId, content, images, comments } = req.body;
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
                $expr: {
                  $and: [
                    { $eq: ["$$parentThreadId", "$parent_thread"] },
                    { $ne: ["$$parentThreadId", "$_id"] },
                  ],
                },
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

    // Array of thread IDs
    const threadIds = threadsWithUserDetails.map((thread) => thread._id);

    // Find likes for threads by the current user
    const threadLikes = await ThreadLikes.find({ liked_by: req.user._id, thread_id: { $in: threadIds } });

    // Map thread likes for quick access
    const threadLikesMap = new Map(threadLikes.map((like) => [like.thread_id.toString(), true]));

    // Fetch reposts by the current user
    const reposts = await RepostedThread.find({ reposted_by: req.user._id, thread_id: { $in: threadIds } });

    // Map reposts for quick access
    const repostsMap = new Map(reposts.map((repost) => [repost.thread_id.toString(), true]));

    // Array of user IDs from threads
    const threadUserIds = threadsWithUserDetails.map((thread) => thread.user_id);

    // Fetch user details for the users associated with the threads
    const users = await Users.find({ _id: { $in: threadUserIds } }, { _id: 1, username: 1, occupation: 1, profile_pic: 1 });

    // Iterate through threads and add necessary details
    for (const thread of threadsWithUserDetails) {
      const isLiked = threadLikesMap.get(thread._id.toString()) || false;
      const isReposted = repostsMap.get(thread._id.toString()) || false;

      thread.isLiked = isLiked;
      thread.isReposted = isReposted;

      const user = users.find((u) => u._id.toString() === thread.user_id.toString());
      thread.user = { ...user.toObject(), isOwner: user._id.toString() === req.user._id };
      delete thread.user_id;
      delete thread.latestComments;
    }

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

module.exports.getLikedThreads = BigPromise(async (req, res) => {
  try {
    const likedThreads = await ThreadLikes.find({ liked_by: req.user._id });
    const threadIds = likedThreads.map((like) => like.thread_id);
    const threads = await Thread.find({ _id: { $in: threadIds } });
    const populatedThreads = await Promise.all(
      threads.map(async (thread) => {
        const user = await Users.findById(
          thread.user_id,
          "username occupation profile_pic"
        );
        return {
          threadId: thread._id,
          content: thread.content,
          images: thread.images,
          is_private: thread.is_private,
          isBase: thread.isBase,
          like_count: thread.like_count,
          comment_count: thread.comment_count,
          user: {
            userId: user._id,
            username: user.username,
            occupation: user.occupation,
            profile_pic: user.profile_pic,
          },
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        };
      })
    );
    ControllerResponse(res, 200, populatedThreads);
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error", err);
  }
});

module.exports.toggleThreadSave = BigPromise(async (req, res) => {
  try {
    const { threadId } = req.body;
    const savedBy = req.user._id;
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return ErrorHandler(res, 404, "Thread not found");
    }
    const existingSave = await ThreadSaves.findOne({
      thread_id: threadId,
      saved_by: savedBy,
    });
    if (existingSave) {
      await ThreadSaves.findByIdAndRemove(existingSave._id);
      thread.saved_count--;
    } else {
      const newSavedThread = new ThreadSaves({
        thread_id: threadId,
        saved_by: savedBy,
      });
      await newSavedThread.save();
      thread.saved_count++;
    }
    await thread.save();
    ControllerResponse(res, 200, "Thread save toggled successfully");
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error", err);
  }
});

module.exports.getSavedThreads = BigPromise(async (req, res) => {
  try {
    const savedThreads = await ThreadSaves.find({ saved_by: req.user._id });
    const threadIds = savedThreads.map((savedThread) => savedThread.thread_id);
    const populatedSavedThreads = await Thread.find({
      _id: { $in: threadIds },
    })
      .populate({
        path: "user_id",
        select: "username occupation profile_pic",
        model: Users,
      })
      .exec();
    ControllerResponse(res, 200, populatedSavedThreads);
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error", err);
  }
});
