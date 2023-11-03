const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const Users = require("../models/usersModel");
const Thread = require("../models/threadsModel");
const Follow = require("../models/follows");
const Comments = require("../models/commentModel");
const RepostedThread = require("../models/repostedThread");
const ThreadLikes = require("../models/threadLikes");

//Helper functions
const deleteCommentsRecursively = async (threadId) => {
  const comments = await Comments.find({ base_thread: threadId });
  for (const comment of comments) {
    await deleteCommentsRecursively(comment.linked_thread);
    await Comments.deleteOne({ _id: comment._id });
    await Thread.deleteOne({ _id: comment.linked_thread });
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
    const { threadId } = req.query;
    const baseThread = await Thread.findById(threadId);
    if (!baseThread) {
      return ErrorHandler(res, 404, "Thread does not exist");
    }
    await deleteCommentsRecursively(threadId);
    await Thread.deleteOne({ _id: threadId });
    ControllerResponse(res, 200, "Thread and its comments deleted successfully");
  } catch (err) {
    console.log(err);
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

    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchFollowers = BigPromise(async (req, res) => {
  try {
    const { userId } = req.query;

    const followers = await Follow.find({ followed_to: userId, is_confirmed: true });
    const followerCount = await Follow.countDocuments({ followed_to: userId, is_confirmed: true });

    ControllerResponse(res, 200, { followers, followerCount });
  } catch (err) {

    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchFollowing = BigPromise(async (req, res) => {
  try {
    const { userId } = req.query;
    const following = await Follow.find({
      followed_by: userId,
      is_confirmed: true,
    });
    const followingCount = await Follow.countDocuments({ followed_by: userId, is_confirmed: true });
    ControllerResponse(res, 200, { following, followingCount });
  } catch (err) {

    ErrorHandler(res, 500, "Internal Server Error");
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

module.exports.fetchFollowingThreads = BigPromise(async (req, res) => {
  try {
    const { _id } = req.user;
    const following = await Follow.find({
      followed_by: _id,
      is_confirmed: true,
    });
    const followingUserIds = following.map((follow) => follow.followed_to);
    console.log(followingUserIds);
    // Fetch threads based on user_id
    const threads = await Thread.find({
      user_id: { $in: followingUserIds },
      isBase: true,
    });

    // Fetch user details for the users associated with the threads
    const users = await Users.find(
      { _id: { $in: threads.map(thread => thread.user_id) } },
      {
        _id: 1,
        username: 1, // Include only the fields you want
        occupation: 1,
        profile_pic: 1,// Include other fields you want
      }
    );


    // Create a map of users by their _id
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // Merge user details with each element in the threads array
    const threadsWithUserDetails = threads.map(thread => {
      const user = userMap.get(thread.user_id.toString());
      return {
        user: user,
        ...thread._doc
      };
    });


    ControllerResponse(res, 200, threadsWithUserDetails);
  } catch (err) {

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

module.exports.repostThread = BigPromise(async (req, res) => {
  try {
    const { threadId } = req.query;
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return ErrorHandler(res, 404, "Thread not found");
    }
    const existingRepost = await RepostedThread.findOne({
      thread_id: threadId,
      reposted_by: req.user._id,
    });

    if (existingRepost) {
      return ErrorHandler(res, 400, "You have already reposted this thread");
    }
    const newRepost = new RepostedThread({
      thread_id: threadId,
      reposted_by: req.user._id,
    });
    await newRepost.save();
    ControllerResponse(res, 200, "Thread reposted successfully");
  } catch (err) {

    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchRepostedUsers = BigPromise(async (req, res) => {
  try {
    const { threadId } = req.query;
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }
    const reposts = await RepostedThread.find({ thread_id: threadId });
    const repostedUserIds = reposts.map((repost) => repost.reposted_by);
    const repostedUsers = await Users.find({ _id: { $in: repostedUserIds } }, 'username');

    ControllerResponse(res, 200, repostedUsers);
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
})

module.exports.toggleThreadLike = BigPromise(async (req, res) => {
  try {
    const { threadId } = req.query;
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

module.exports.fetchAllActivities = BigPromise(async (req, res) => {
  try {
    const { userId } = req.query; // Assuming this is the logged-in user's ID

    const followRequestCount = await Follow.countDocuments({ followed_to: userId, is_confirmed: false });

    // Fetch the latest two follow requests
    const latestFollowRequests = await Follow.find(
      { followed_to: userId, is_confirmed: false },
      null,
      { sort: { createdAt: -1 }, limit: 2 }
    );

    // Initialize arrays to store profile pictures and names
    const profilePics = [];
    const names = [];

    // Iterate through the latest follow requests
    for (const followRequest of latestFollowRequests) {
      // Fetch the user's details based on the follow request
      const user = await Users.findById(followRequest.followed_by);

      // Check if the user and their profile picture exist
      if (user && user.profile_pic) {
        profilePics.push(user.profile_pic);
        names.push(user.name);
      }
    }

    // Now, profilePics and names arrays contain the latest two profile pictures and names
    ControllerResponse(res, 200, { profilePics, names, followRequestCount });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

module.exports.fetchAllFollowRequest = BigPromise(async (req, res) => {
  try {
    const user_id = req.user._id;
    const followRequests = await Follow.find({ followed_to: user_id, is_confirmed: false });
    const data = [];
    for (const Request of followRequests) {
      const user = await Users.findById(Request.followed_by);

      if (user) {
        const userData = {
          Name: user.name,
          UserName: user.username,
          Occupation: user.occupation,
          ProfilePic: user.profile_pic,
        };
        data.push(userData);
      }
    }
    ControllerResponse(res, 200, data);
  } catch (error) {
    console.error(error);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

// Search for users by username, name, or email
module.exports.searchAPI = BigPromise(async (req, res) => {
  try {
    const { query } = req.query; // Get the search query from the request query parameter

    if (!query) {
      return ErrorHandler(res, 400, 'Search field is required.');
    }

    // Define the fields you want to retrieve
    const projection = {
      username: 1,
      name: 1,
      profile_pic: 1,
      occupation: 1,
    };

    // Use a regular expression to perform a case-insensitive search on multiple fields
    const users = await Users.find(
      {
        $or: [
          { username: { $regex: new RegExp(query, 'i') } },
          { name: { $regex: new RegExp(query, 'i') } },
          { email: { $regex: new RegExp(query, 'i') } },
        ],
      },
      projection // Apply the projection to retrieve specific fields
    );

    if (users.length === 0) {
      return ErrorHandler(res, 404, 'No users found for the given query.');
    }

    ControllerResponse(res, 200, users);
  } catch (error) {
    console.error(error);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});


