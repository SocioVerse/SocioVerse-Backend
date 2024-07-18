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
const FirebaseAdminService = require("../utils/adminFireBaseService");
const DeviceFCMToken = require("../models/deviceFcmTocken");

//Helper Functions

const deleteCommentsRecursively = async (threadId) => {
  const comments = await Thread.find({
    parent_thread: threadId,
    _id: { $ne: threadId }
  });
  if (comments.length <= 1) {
    return;
  }


  for (const comment of comments) {
    await deleteCommentsRecursively(comment._id);
    console.log(comment.content);
    FirebaseAdminService.deleteFilesFromStorageByUrls(comment.images);
    await Thread.deleteOne({ _id: new mongoose.Types.ObjectId(comment._id) });
    await ThreadLikes.deleteMany({ thread_id: new mongoose.Types.ObjectId(comment._id) });
    await RepostedThread.deleteMany({ thread_id: new mongoose.Types.ObjectId(comment._id) });
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
    const { threadId } = req.query;
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return ErrorHandler(res, 400, "Thread not found");
    }
    if (thread.is_private && thread.user_id.toString() !== req.user._id.toString()) {
      const isFollower = await Follow.findOne({
        follower: req.user._id,
        following: thread.user_id,
      });
      if (!isFollower) {
        return ErrorHandler(res, 400, {
          message: "This thread is private",
          user_id: thread.user_id,
        });
      }
    }

    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(threadId),
        },
      },
      {
        $sort: { like_count: -1 },
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
    ]);

    console.log(threadsWithUserDetails);

    // Fetch comment users' details and map by ID
    const commentUserIds = new Set();
    threadsWithUserDetails.forEach((thread) => {
      thread.latestComments.forEach((comment) => {
        commentUserIds.add(comment.user_id.toString());
      });
    });

    const commentUsers = await Users.find({ _id: { $in: Array.from(commentUserIds) } }, { _id: 1, profile_pic: 1 });

    const commentUserMap = new Map(commentUsers.map((user) => [user._id.toString(), user]));

    // Fetch user details for threads
    const threadUserIds = threadsWithUserDetails.map((thread) => thread.user_id);

    const threadIds = threadsWithUserDetails.map((thread) => thread._id);



    const [users, threadLikes, reposts, saves] = await Promise.all([
      Users.find({ _id: { $in: threadUserIds } }, { _id: 1, username: 1, occupation: 1, profile_pic: 1 }),
      ThreadLikes.find({ liked_by: req.user._id, thread_id: { $in: threadIds } }),
      RepostedThread.find({ reposted_by: req.user._id, thread_id: { $in: threadIds } }),
      ThreadSaves.find({ saved_by: req.user._id, thread_id: { $in: threadIds } }),
    ]);

    const threadLikesMap = new Map(threadLikes.map((like) => [like.thread_id.toString(), true]));
    const repostsMap = new Map(reposts.map((repost) => [repost.thread_id.toString(), true]));
    const savedThreadsMap = new Map(saves.map((savedThread) => [savedThread.thread_id.toString(), true]));
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    console.log(saves);

    console.log(threadsWithUserDetails)
    // Process threads and add necessary details
    const fetchedThread = threadsWithUserDetails.map((thread) => {
      thread.isReposted = repostsMap.get(thread._id.toString()) || false;
      thread.isLiked = threadLikesMap.get(thread._id.toString()) || false;
      thread.isSaved = savedThreadsMap.get(thread._id.toString()) || false;
      const user = userMap.get(thread.user_id.toString());
      thread.user = { ...user.toObject(), isOwner: user._id.toString() === req.user._id };

      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      delete thread.user_id;
      delete thread.latestComments;
      return thread;
    });
    if (!fetchedThread) {
      return ErrorHandler(res, 404, "Thread not found");
    }

    ControllerResponse(res, 200, fetchedThread[0]);
  } catch (err) {
    console.error(err);
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
    console.log(baseThread);
    if (!baseThread) {
      return ErrorHandler(res, 404, "Thread does not exist");
    }

    await deleteCommentsRecursively(threadId);
    await Thread.updateOne({ _id: baseThread.parent_thread }, { $inc: { comment_count: -1 } });
    await FirebaseAdminService.deleteFilesFromStorageByUrls(baseThread.images);
    await Thread.deleteOne({ _id: threadId });
    await ThreadLikes.deleteMany({ thread_id: threadId });
    await RepostedThread.deleteMany({ thread_id: threadId });
    if (baseThread.isBase) {
      await RepostedThread.deleteMany({ thread_id: threadId });
      await Users.findByIdAndUpdate(req.user._id, {
        $inc: { post_count: -1 },
      });
    }


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
    const thread = await Thread.findById(threadId);
    const user = await Users.findById(req.user._id);
    const fcmTokens = await DeviceFCMToken.find({
      $and: [
        { user_id: thread.user_id },
        { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } }
      ]
    }, { fcm_token: 1, user_id: 1 });
    console.log(fcmTokens);
    if (fcmTokens.length > 0)
      await FirebaseAdminService.sendNotifications({
        fcmTokens: fcmTokens.map(
          (fcmToken) => fcmToken.fcm_token
        ), notification: "New Comment", body: user.username + " just commented your thread"
      });




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
  const { commentId } = req.query;

  try {
    const parentComment = await Thread.findById(commentId);
    if (!parentComment) {
      return ErrorHandler(res, 400, "Parent Comment not found");
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
    ]);
    // Fetch comment users' details and map by ID
    const commentUserIds = new Set();
    threadsWithUserDetails.forEach((thread) => {
      thread.latestComments.forEach((comment) => {
        commentUserIds.add(comment.user_id.toString());
      });
    });
    const threadIds = threadsWithUserDetails.map((thread) => thread._id);
    const commentUsers = await Users.find({ _id: { $in: Array.from(commentUserIds) } }, { _id: 1, profile_pic: 1 });

    const commentUserMap = new Map(commentUsers.map((user) => [user._id.toString(), user]));
    const [threadLikes, reposts, users, saves] = await Promise.all([
      ThreadLikes.find({ liked_by: req.user._id, thread_id: { $in: threadIds } }),
      RepostedThread.find({ reposted_by: req.user._id, thread_id: { $in: threadIds } }),
      Users.find({ _id: { $in: threadsWithUserDetails.map((thread) => thread.user_id) } }, { _id: 1, username: 1, occupation: 1, profile_pic: 1 }),
      ThreadSaves.find({ saved_by: req.user._id, thread_id: { $in: threadIds } }),
    ]);

    const threadLikesMap = new Map(threadLikes.map((like) => [like.thread_id.toString(), true]));
    const repostsMap = new Map(reposts.map((repost) => [repost.thread_id.toString(), true]));
    const savedMap = new Map(saves.map((repost) => [repost.thread_id.toString(), true]));

    threadsWithUserDetails.forEach((thread) => {
      thread.isLiked = threadLikesMap.get(thread._id.toString()) || false;
      thread.isReposted = repostsMap.get(thread._id.toString()) || false;
      thread.isSaved = savedMap.get(thread._id.toString()) || false;
      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      const user = users.find((u) => u._id.toString() === thread.user_id.toString());
      thread.user = { ...user.toObject(), isOwner: user._id.toString() === req.user._id };
      delete thread.user_id;
      delete thread.latestComments;
    });

    return ControllerResponse(res, 200, threadsWithUserDetails);

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
    const user = await Users.findById(req.user._id);

    const thread = await Thread.findById(threadId);
    const existingLike = await ThreadLikes.findOne({
      thread_id: threadId,
      liked_by: likedBy,
    });


    if (existingLike) {
      await ThreadLikes.findByIdAndRemove(existingLike._id);
      thread.like_count--;
    }
    else {
      const newLike = new ThreadLikes({
        thread_id: threadId,
        liked_by: likedBy,
      });
      await newLike.save();
      thread.like_count++;
      // const fcmTokens = await DeviceFCMToken.find({
      //   $and: [
      //     { user_id: thread.user_id },
      //     { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } }
      //   ]
      // }, { fcm_token: 1, user_id: 1 });
      // console.log(fcmTokens);
      // if (fcmTokens.length > 0)
      //   await FirebaseAdminService.sendNotifications({
      //     fcmTokens: fcmTokens.map(
      //       (fcmToken) => fcmToken.fcm_token
      //     ), notification: "New Like", body: user.username + " just liked your thread"
      //   });
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
    const userId = req.user._id;
    const likedThreadsIds = await ThreadLikes.find({ liked_by: userId }).select("thread_id");

    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: {
          _id: { $in: likedThreadsIds.map((thread) => thread.thread_id) },
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
    ]);
    // Fetch comment users' details and map by ID
    const commentUserIds = new Set();
    threadsWithUserDetails.forEach((thread) => {
      thread.latestComments.forEach((comment) => {
        commentUserIds.add(comment.user_id.toString());
      });
    });

    const commentUsers = await Users.find({ _id: { $in: Array.from(commentUserIds) } }, { _id: 1, profile_pic: 1 });

    const commentUserMap = new Map(commentUsers.map((user) => [user._id.toString(), user]));
    const threadIds = threadsWithUserDetails.map((thread) => thread._id);
    const UserIds = threadsWithUserDetails.map((thread) => thread.user_id);
    const [user, threadLikes, reposts, saves] = await Promise.all([
      Users.find({ _id: { $in: UserIds } }, { _id: 1, username: 1, occupation: 1, profile_pic: 1 }),
      ThreadLikes.find({ liked_by: req.user._id, thread_id: { $in: threadIds } }),
      RepostedThread.find({ reposted_by: req.user._id, thread_id: { $in: threadIds } }),
      ThreadSaves.find({ saved_by: req.user._id, thread_id: { $in: threadIds } }),
    ]);

    const threadLikesMap = new Map(threadLikes.map((like) => [like.thread_id.toString(), true]));
    const repostsMap = new Map(reposts.map((repost) => [repost.thread_id.toString(), true]));
    const savedThreadsMap = new Map(saves.map((savedThread) => [savedThread.thread_id.toString(), true]));
    const userMap = new Map(user.map((user) => [user._id.toString(), user]));
    threadsWithUserDetails.forEach((thread) => {
      thread.isReposted = !!repostsMap.get(thread._id.toString());
      thread.isLiked = !!threadLikesMap.get(thread._id.toString());
      thread.isSaved = !!savedThreadsMap.get(thread._id.toString());

      thread.user = { ...userMap.get(thread.user_id.toString()).toObject(), isOwner: thread.user_id.toString() === req.user._id.toString() };


      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      delete thread.user_id;
      delete thread.latestComments;
    });
    return ControllerResponse(res, 200, threadsWithUserDetails);
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
      ControllerResponse(res, 200, "Removed Saved");
      return;
    } else {
      const newSavedThread = new ThreadSaves({
        thread_id: threadId,
        saved_by: savedBy,
      });
      await newSavedThread.save();
      thread.saved_count++;
    }
    await thread.save();
    ControllerResponse(res, 200, "Saved Thread");
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error", err);
  }
});

module.exports.getSavedThreads = BigPromise(async (req, res) => {
  try {
    const userId = req.user._id;
    const savedThreadsIds = await ThreadSaves.find({ saved_by: userId }).select("thread_id");

    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: {
          _id: { $in: savedThreadsIds.map((thread) => thread.thread_id) },
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
    ]);
    // Fetch comment users' details and map by ID
    const commentUserIds = new Set();
    threadsWithUserDetails.forEach((thread) => {
      thread.latestComments.forEach((comment) => {
        commentUserIds.add(comment.user_id.toString());
      });
    });

    const commentUsers = await Users.find({ _id: { $in: Array.from(commentUserIds) } }, { _id: 1, profile_pic: 1 });

    const commentUserMap = new Map(commentUsers.map((user) => [user._id.toString(), user]));
    const threadIds = threadsWithUserDetails.map((thread) => thread._id);
    const UserIds = threadsWithUserDetails.map((thread) => thread.user_id);
    const [user, threadLikes, reposts, saves] = await Promise.all([
      Users.find({ _id: { $in: UserIds } }, { _id: 1, username: 1, occupation: 1, profile_pic: 1 }),
      ThreadLikes.find({ liked_by: req.user._id, thread_id: { $in: threadIds } }),
      RepostedThread.find({ reposted_by: req.user._id, thread_id: { $in: threadIds } }),
      ThreadSaves.find({ saved_by: req.user._id, thread_id: { $in: threadIds } }),
    ]);

    const threadLikesMap = new Map(threadLikes.map((like) => [like.thread_id.toString(), true]));
    const repostsMap = new Map(reposts.map((repost) => [repost.thread_id.toString(), true]));
    const savedThreadsMap = new Map(saves.map((savedThread) => [savedThread.thread_id.toString(), true]));
    const userMap = new Map(user.map((user) => [user._id.toString(), user]));

    threadsWithUserDetails.forEach((thread) => {
      thread.isReposted = !!repostsMap.get(thread._id.toString());
      thread.isLiked = !!threadLikesMap.get(thread._id.toString());
      thread.isSaved = !!savedThreadsMap.get(thread._id.toString());
      thread.user = { ...userMap.get(thread.user_id.toString()).toObject(), isOwner: thread.user_id.toString() === req.user._id.toString() };

      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      delete thread.user_id;
      delete thread.latestComments;
    });

    return ControllerResponse(res, 200, threadsWithUserDetails);
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error", err);
  }
});
module.exports.fetchThreadLikes = BigPromise(async (req, res) => {
  try {
    const { threadId } = req.query;
    const threadLikes = await ThreadLikes.find({
      thread_id: threadId
    }
    );
    if (!threadLikes) {
      return ErrorHandler(res, 404, "Feed not found");
    }
    const likes = threadLikes.map((like) => like.liked_by);
    console.log("Likes", threadLikes)
    const users = await Users.find({
      _id: {
        $in: likes,
      },
    }, {
      _id: 1,
      username: 1,
      profile_pic: 1,
      occupation: 1,
      email: 1,
    });
    console.log("users", users)
    for (let i = 0; i < users.length; i++) {
      if (users[i]._id.toString() === req.user._id) {
        users[i]._doc.isOwner = true;
      } else {
        users[i]._doc.isOwner = false;
      }
    }

    ControllerResponse(res, 200, users);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchTrendingThreads = BigPromise(async (req, res) => {
  try {
    const { _id } = req.user;

    // Fetch threads with comments
    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: {
          is_private: false,
          isBase: true,
        },
      },
      {
        $sort: { like_count: -1 },
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
    ]);

    // Fetch comment users' details and map by ID
    const commentUserIds = new Set();
    threadsWithUserDetails.forEach((thread) => {
      thread.latestComments.forEach((comment) => {
        commentUserIds.add(comment.user_id.toString());
      });
    });

    const commentUsers = await Users.find({ _id: { $in: Array.from(commentUserIds) } }, { _id: 1, profile_pic: 1 });

    const commentUserMap = new Map(commentUsers.map((user) => [user._id.toString(), user]));

    // Fetch user details for threads
    const threadUserIds = threadsWithUserDetails.map((thread) => thread.user_id);

    const threadIds = threadsWithUserDetails.map((thread) => thread._id);



    const [users, threadLikes, reposts, saves] = await Promise.all([
      Users.find({ _id: { $in: threadUserIds } }, { _id: 1, username: 1, occupation: 1, profile_pic: 1 }),
      ThreadLikes.find({ liked_by: req.user._id, thread_id: { $in: threadIds } }),
      RepostedThread.find({ reposted_by: req.user._id, thread_id: { $in: threadIds } }),
      ThreadSaves.find({ saved_by: req.user._id, thread_id: { $in: threadIds } }),
    ]);

    const threadLikesMap = new Map(threadLikes.map((like) => [like.thread_id.toString(), true]));
    const repostsMap = new Map(reposts.map((repost) => [repost.thread_id.toString(), true]));
    const savedThreadsMap = new Map(saves.map((savedThread) => [savedThread.thread_id.toString(), true]));
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    console.log(saves);
    // Process threads and add necessary details
    const trendingThreads = threadsWithUserDetails.map((thread) => {
      thread.isReposted = repostsMap.get(thread._id.toString()) || false;
      thread.isLiked = threadLikesMap.get(thread._id.toString()) || false;
      thread.isSaved = savedThreadsMap.get(thread._id.toString()) || false;
      const user = userMap.get(thread.user_id.toString());
      thread.user = { ...user.toObject(), isOwner: user._id.toString() === _id };

      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      delete thread.user_id;
      delete thread.latestComments;
      return thread;
    });

    ControllerResponse(res, 200, trendingThreads);
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});