const Users = require("../models/usersModel");
const { hashPassword, verifyPassword } = require("../routes/encryption");
const BigPromise = require("../middlewares/bigPromise");
const jwt = require("../utils/jwtService");
const { default: mongoose } = require("mongoose");
const FirebaseAdminService = require("../utils/adminFireBaseService");
const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");
const RefreshToken = require("../models/refreshToken");
const Follow = require("../models/follows");
const Thread = require("../models/threadsModel");
const RepostedThread = require("../models/repostedThread");
const ThreadLikes = require("../models/threadLikes");
const ThreadSaves = require("../models/threadSaves");
const DeviceFCMToken = require("../models/deviceFcmTocken");
const e = require("express");
function checkEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

module.exports.signup = BigPromise(async (req, res) => {
  const {
    email,
    password,
    name,
    phone_number,
    username,
    occupation,
    country,
    dob,
    profile_pic,
    face_image_dataset,
    fcmToken

  } = req.body;
  console.log(req.body);
  if (checkEmail(email) == false) {
    return ErrorHandler(res, 400, "Invalid Email");
  }
  if (password == null || password == undefined || password.length < 6) {
    return ErrorHandler(res, 400, "Invalid Password");
  }
  const userExist = await Users.findOne({ email });
  if (userExist) {
    return ErrorHandler(res, 400, "Email already exists");
  }
  const usernameExists = await Users.findOne({ username });
  if (usernameExists) {
    return ErrorHandler(res, 400, "Username already exists");
  }
  try {
    const user = await Users.create({
      email,
      password: await hashPassword(password),
      name,
      phone_number,
      username,
      occupation,
      country,
      dob: Date.parse(dob),
      profile_pic,
      face_image_dataset: face_image_dataset ?? [],
    });
    user.save();
    const access_token = jwt.sign({
      _id: user._id,
      phone_number,
      email,
    });
    const refresh_token = jwt.sign(
      {
        _id: user._id,
        phone_number,
        email,
      },
      "30d",
      process.env.REFRESH_TOKEN_KEY
    );

    // store refresh token in database
    await RefreshToken.create({ token: refresh_token });
    await DeviceFCMToken({
      user_id: user._id,
      fcm_token: fcmToken
    }).save();
    delete user._doc.password;
    return ControllerResponse(res, 200, {
      message: "Signup Successfull!",
      ...user._doc,
      refresh_token,
      access_token,
    });
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.login = BigPromise(async (req, res) => {
  const { usernameOrEmail, password, fcmToken } = req.body;
  if (!usernameOrEmail || !password) {
    return ErrorHandler(res, 400, "Username/Email and password are required");
  }
  try {
    const user = await Users.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      return ErrorHandler(res, 400, "Invalid credentials");
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return ErrorHandler(res, 400, "Invalid credentials");
    }
    const access_token = jwt.sign({
      _id: user._id,
      phone_number: user.phone_number,
      email: user.email,
    });

    const refresh_token = jwt.sign(
      {
        _id: user._id,
        phone_number: user.phone_number,
        email: user.email,
      },
      "30d",
      process.env.REFRESH_TOKEN_KEY
    );
    await RefreshToken.create({ token: refresh_token });
    await DeviceFCMToken({
      user_id: user._id,
      fcm_token: fcmToken
    }).save();
    delete user._doc.password;
    return ControllerResponse(res, 200, {
      message: "Login Successful!",
      ...user._doc,
      refresh_token,
      access_token,
    });
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.logout = BigPromise(async (req, res) => {
  try {
    const { fcm_token } = req.query;
    await DeviceFCMToken.deleteMany({ fcm_token });
    ControllerResponse(res, 200, "logout successfull");
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});



module.exports.verifyEmailExists = BigPromise(async (req, res) => {
  try {
    const { email } = req.query;
    if (checkEmail(email) == false) {
      return ErrorHandler(res, 400, "Invalid Email");
    }



    const user = await Users.findOne({ email: email });
    if (user) {
      return ErrorHandler(res, 400,
        "Email already exists");
    }
    return ControllerResponse(res, 200, {
      email_exists: false,
    });
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.verifyUsernameExists = BigPromise(async (req, res) => {
  try {
    const { username } = req.query;
    const user = await Users.findOne({ username: username });
    return ControllerResponse(res, 200, {
      username_exists: user ? true : false,
    });
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchUserDetails = BigPromise(async (req, res) => {
  try {
    const user = await Users.findById(req.user._id);
    delete user._doc.password;
    return ControllerResponse(res, 200, {
      ...user._doc,
    });
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.updateUserProfile = BigPromise(async (req, res) => {
  const _id = req.user._id;
  const updateData = req.body;
  try {
    const user = await Users.findById(_id);
    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }
    if (updateData.username) {
      const usernameExists = await Users.findOne({
        username: updateData.username,
        email: { $ne: user.email },
      });
      if (usernameExists) {
        return ErrorHandler(res, 400, "Username already exists");
      }
    }
    await Users.findByIdAndUpdate(_id,
      updateData);

    await user.save();
    delete user._doc.password;
    return ControllerResponse(res, 200, {
      message: "Profile updated successfully",
      ...user._doc,
    });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
module.exports.fetchLatestFollowRequests = BigPromise(async (req, res) => {
  try {
    const userId = req.user._id; // Assuming this is the logged-in user's ID

    const followRequestCount = await Follow.countDocuments({
      followed_to: new mongoose.Types.ObjectId(userId),
      is_confirmed: false,
    });

    // Fetch the latest two follow requests
    const latestFollowRequests = await Follow.find(
      { followed_to: new mongoose.Types.ObjectId(userId), is_confirmed: false },
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
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchAllFollowRequest = BigPromise(async (req, res) => {
  try {
    const user_id = req.user._id;
    const followRequests = await Follow.find({
      followed_to: user_id,
      is_confirmed: false,
    });
    const data = [];
    for (const Request of followRequests) {
      const user = await Users.findById(Request.followed_by);

      if (user) {
        const userData = {
          _id: user._id,
          name: user.name,
          username: user.username,
          occupation: user.occupation,
          profile_pic: user.profile_pic,
        };
        data.push(userData);
      }
    }
    ControllerResponse(res, 200, data);
  } catch (error) {
    console.error(error);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

// Search for users by username, name, or email
module.exports.searchAPI = BigPromise(async (req, res) => {
  try {
    const { query } = req.query; // Get the search query from the request query parameter

    if (!query) {
      return ErrorHandler(res, 400, "Search field is required.");
    }

    const pipeline = [
      {
        $match: {
          $or: [
            { username: { $regex: new RegExp(query, "i") } },
            { name: { $regex: new RegExp(query, "i") } },
            { email: { $regex: new RegExp(query, "i") } },
          ],
          _id: { $ne: new mongoose.Types.ObjectId(req.user._id) }, // Exclude the logged-in user
        },
      },
      {
        $lookup: {
          from: "follows",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$followed_by",
                        new mongoose.Types.ObjectId(req.user._id),
                      ],
                    },
                    { $eq: ["$followed_to", "$$userId"] },
                  ],
                },
              },
            },
          ],
          as: "followData",
        },
      },
      {
        $project: {
          username: 1,
          name: 1,
          profile_pic: 1,
          occupation: 1,
          state: {
            $cond: {
              if: { $eq: [{ $size: "$followData" }, 0] },
              then: 0, // Not followed
              else: {
                $cond: {
                  if: {
                    $eq: [
                      { $arrayElemAt: ["$followData.is_confirmed", 0] },
                      true,
                    ],
                  },
                  then: 2, // Following and confirmed
                  else: 1, // Sent request
                },
              },
            },
          },
        },
      },
    ];

    const users = await Users.aggregate(pipeline);
    console.log(users);
    ControllerResponse(res, 200, users);
  } catch (error) {
    console.error(error);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchFollowers = BigPromise(async (req, res) => {
  try {
    const userId = req.query.userId ?? req.user._id;

    const followers = await Follow.aggregate([
      {
        $match: {
          followed_to: new mongoose.Types.ObjectId(userId),
          is_confirmed: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "followed_by",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          "user._id": 1,
          "user.profile_pic": 1,
          "user.username": 1,
          "user.name": 1,
          "user.occupation": 1,
          _id: 0, // Exclude the default _id field
        },
      },
    ]);

    for (let i = 0; i < followers.length; i++) {
      const isFollowing = await Follow.findOne({
        followed_by: req.user._id,
        followed_to: followers[i].user._id,
      });
      followers[i].state = followers[i].user._id.toString() == req.user._id.toString() ? 3 :
        isFollowing != null ? (isFollowing.is_confirmed == true ? 2 : 1) : 0;
    }
    followers.sort((a, b) => b.state - a.state);
    ControllerResponse(res, 200, followers);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchFollowing = BigPromise(async (req, res) => {
  try {
    const userId = req.query.userId ?? req.user._id;

    const following = await Follow.aggregate([
      {
        $match: {
          followed_by: new mongoose.Types.ObjectId(userId),
          is_confirmed: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "followed_to",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          "user._id": 1,
          "user.profile_pic": 1,
          "user.username": 1,
          "user.name": 1,
          "user.occupation": 1,
          _id: 0, // Exclude the default _id field
        },
      },
    ]);

    for (let i = 0; i < following.length; i++) {
      const isFollowing = await Follow.findOne({
        followed_by: req.user._id,
        followed_to: following[i].user._id,
      });
      following[i].state = following[i].user._id.toString() == req.user._id.toString() ? 3 :
        isFollowing != null ? (isFollowing.is_confirmed == true ? 2 : 1) : 0;
    }
    following.sort((a, b) => b.state - a.state);
    ControllerResponse(res, 200, following);
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
module.exports.toogleRepostThread = BigPromise(async (req, res) => {
  try {
    const { threadId } = req.body;
    const thread = await Thread.findById(threadId);
    const user = await Users.findById(req.user._id);
    if (!thread) {
      return ErrorHandler(res, 404, "Thread not found");
    }
    const existingRepost = await RepostedThread.findOne({
      thread_id: threadId,
      reposted_by: req.user._id,
    });

    if (existingRepost) {
      await existingRepost.deleteOne({
        thread_id: threadId,
        reposted_by: req.user._id,
      });
      ControllerResponse(res, 200, "Removed Repost");
      return;
    }
    const newRepost = new RepostedThread({
      thread_id: threadId,
      reposted_by: req.user._id,
    });
    await newRepost.save();
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
        ), notification: "Repost", body: user.username + " just reposted your thread"
      });


    ControllerResponse(res, 200, "Thread Reposted");
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.fetchFollowingThreads = BigPromise(async (req, res) => {


  try {
    const { _id } = req.user;
    // Fetch followingUserIds directly without aggregation
    const followingUsers = await Follow.find({
      followed_by: _id,
      is_confirmed: true,
    }).distinct('followed_to');

    // Fetch threads with comments
    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: {
          $or: [
            { user_id: { $in: followingUsers } },
            {
              is_private: false,
              user_id: { $ne: new mongoose.Types.ObjectId(_id) }

            },

          ],
          isBase: true,
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
    const processedThreads = threadsWithUserDetails.map((thread) => {
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

    ControllerResponse(res, 200, processedThreads);
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.createFollowRequest = BigPromise(async (req, res) => {
  try {
    const requestingUserId = req.user._id;
    const { targetUserId } = req.body;

    // Check if the request already exists
    const userExists = await Users.findOne({
      _id: new mongoose.Types.ObjectId(targetUserId),
    });
    if (!userExists) {
      return ErrorHandler(res, 404, "User not found");
    }

    const existingRequest = await Follow.findOne({
      followed_by: new mongoose.Types.ObjectId(requestingUserId),
      followed_to: new mongoose.Types.ObjectId(targetUserId),
    });

    if (existingRequest) {
      await existingRequest.deleteOne({
        followed_by: new mongoose.Types.ObjectId(requestingUserId),
        followed_to: new mongoose.Types.ObjectId(targetUserId),
      });

      ControllerResponse(res, 200, "Follow Request Sent Succesfully Deleted");

    }
    else {

      // Create a new follow request
      const followRequest = new Follow({
        followed_by: new mongoose.Types.ObjectId(requestingUserId),
        followed_to: new mongoose.Types.ObjectId(targetUserId),
        is_confirmed: false,
      });

      await followRequest.save();
      const user = await Users.findById(requestingUserId);
      const fcmTokens = await DeviceFCMToken.find({
        $and: [
          { user_id: targetUserId },
          { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } }
        ]
      }, { fcm_token: 1 });
      console.log(fcmTokens);
      if (fcmTokens.length > 0)
        await FirebaseAdminService.sendNotifications({
          fcmTokens: fcmTokens.map(
            (fcmToken) => fcmToken.fcm_token
          ), notification: "New Request", body: user.username + " just send you a follow request"
        });
      ControllerResponse(res, 200, "Follow Request Sent Succesfully");
    }
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.unFollowUser = BigPromise(async (req, res) => {
  try {
    const requestingUserId = req.user._id;
    const { targetUserId } = req.query;
    console.log(targetUserId);
    // Check if the request already exists
    const userExists = await Users.findOne({
      _id: new mongoose.Types.ObjectId(targetUserId),
    });
    if (!userExists) {
      return ErrorHandler(res, 404, "User not found");
    }

    await Users.updateOne(
      { _id: new mongoose.Types.ObjectId(targetUserId) },
      { $inc: { followers_count: -1 } }
    );
    await Users.updateOne(
      { _id: new mongoose.Types.ObjectId(requestingUserId) },
      { $inc: { following_count: -1 } }
    );
    await Follow.deleteOne({
      followed_by: new mongoose.Types.ObjectId(requestingUserId),
      followed_to: new mongoose.Types.ObjectId(targetUserId),
    });



    ControllerResponse(res, 200, "Follow Request Sent Succesfully");
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.confirmFollowRequest = BigPromise(async (req, res) => {
  try {
    const requestingUserId = req.user._id;
    const { targetUserId } = req.body;


    const userExists = await Users.findOne({
      _id: new mongoose.Types.ObjectId(targetUserId),
    });
    if (!userExists) {
      return ErrorHandler(res, 404, "User not found");
    }
    const Request = await Follow.findOne({
      followed_by: targetUserId,
      followed_to: requestingUserId,
    });

    if (Request) {
      Request.is_confirmed = true;
    } else {
      return Error(res, 404, "Follow Request Not Found");
    }
    await Users.updateOne(
      { _id: new mongoose.Types.ObjectId(requestingUserId) },
      { $inc: { followers_count: 1 } }
    );
    await Users.updateOne(
      { _id: new mongoose.Types.ObjectId(targetUserId) },
      { $inc: { following_count: 1 } }
    );
    await Request.save();
    const user = await Users.findById(requestingUserId);
    const fcmTokens = await DeviceFCMToken.find({
      $and: [
        { user_id: targetUserId },
        { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } }
      ]
    }, { fcm_token: 1 });
    console.log(fcmTokens);
    if (fcmTokens.length > 0)
      await FirebaseAdminService.sendNotifications({
        fcmTokens: fcmTokens.map(
          (fcmToken) => fcmToken.fcm_token
        ), notification: "Request Accepted", body: user.username + " just accepted your follow request"
      });

    ControllerResponse(res, 200, "Follow Request Accepted");
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.deleteFollowRequest = BigPromise(async (req, res) => {
  try {
    const requestingUserId = req.user._id;
    const { targetUserId } = req.query;
    // Check if the request already exists
    const userExists = await Users.findOne({
      _id: new mongoose.Types.ObjectId(targetUserId),
    });
    if (!userExists) {
      return ErrorHandler(res, 404, "User not found");
    }
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

module.exports.fetchUserProfileDetails = BigPromise(async (req, res) => {
  try {
    console.log(req.query);
    const userId = req.query.userId ?? req.user._id;
    console.log(userId);


    const user = await Users.findById(userId, {
      name: 1,
      username: 1,
      occupation: 1,
      profile_pic: 1,
      bio: 1,
      followers_count: 1,
      following_count: 1,
      post_count: 1,
      country: 1,
      dob: 1,
      phone_number: 1,
      email: 1,
    });

    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }

    const threadsQuery = {
      user_id: new mongoose.Types.ObjectId(userId),
      isBase: true,
    };

    if (req.user._id.toString() != userId) {
      const isFollowing = await Follow.findOne({
        followed_by: req.user._id,
        followed_to: userId,
      });
      user._doc.state = isFollowing != null ? (isFollowing.is_confirmed == true ? 2 : 1) : 0;
    }

    if (user._doc.state == 0 || user._doc.state == 1) {
      threadsQuery.is_private = false;
    }

    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: threadsQuery,
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
    // Array of user IDs from threads
    const threadUserIds = threadsWithUserDetails.map((thread) => thread.user_id);

    const users = new Map();
    for (const threadUserId of threadUserIds) {
      const user = await Users.findById(threadUserId, { _id: 1, username: 1, occupation: 1, profile_pic: 1 });
      users.set(threadUserId.toString(), user);
    }
    const threadIds = threadsWithUserDetails.map((thread) => thread._id);

    const threadLikes = await ThreadLikes.find({ liked_by: req.user._id, thread_id: { $in: threadIds } });
    const reposts = await RepostedThread.find({ reposted_by: req.user._id, thread_id: { $in: threadIds } });
    const savedThreads = await ThreadSaves.find({ saved_by: req.user._id, thread_id: { $in: threadIds } });
    const threadLikesMap = new Map(threadLikes.map((like) => [like.thread_id.toString(), true]));
    const repostsMap = new Map(reposts.map((repost) => [repost.thread_id.toString(), true]));
    const savedThreadsMap = new Map(savedThreads.map((savedThread) => [savedThread.thread_id.toString(), true]));
    for (const thread of threadsWithUserDetails) {
      thread.isReposted = !!repostsMap.get(thread._id.toString());
      thread.isLiked = !!threadLikesMap.get(thread._id.toString());
      thread.isSaved = !!savedThreadsMap.get(thread._id.toString());
      const user = users.get(thread.user_id.toString());
      thread.user = { ...user.toObject(), isOwner: user._id.toString() === req.user._id };
      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      delete thread.user_id;
      delete thread.latestComments;
    }



    ControllerResponse(res, 200, { user, threadsWithUserDetails });


  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.addBio = BigPromise(async (req, res) => {
  try {
    const { bio } = req.body;
    const user = await Users.findById(req.user._id);
    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }
    user.bio = bio;
    await user.save();



    ControllerResponse(res, 200, "Bio added successfully");


  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
module.exports.fetchRepostedThread = BigPromise(async (req, res) => {
  try {
    const userId = req.query.userId ?? req.user._id;
    const repostedThreadsIds = await RepostedThread.find({ reposted_by: userId }).select("thread_id");

    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: {
          _id: { $in: repostedThreadsIds.map((thread) => thread.thread_id) },
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

    const [user, threadLikes, reposts, saves] = await Promise.all([
      Users.findById(userId, { _id: 1, username: 1, occupation: 1, profile_pic: 1 }),
      ThreadLikes.find({ liked_by: req.user._id, thread_id: { $in: threadIds } }),
      RepostedThread.find({ reposted_by: req.user._id, thread_id: { $in: threadIds } }),
      ThreadSaves.find({ saved_by: req.user._id, thread_id: { $in: threadIds } }),
    ]);

    const threadLikesMap = new Map(threadLikes.map((like) => [like.thread_id.toString(), true]));
    const repostsMap = new Map(reposts.map((repost) => [repost.thread_id.toString(), true]));
    const savedThreadsMap = new Map(saves.map((savedThread) => [savedThread.thread_id.toString(), true]));

    threadsWithUserDetails.forEach((thread) => {
      thread.isReposted = !!repostsMap.get(thread._id.toString());
      thread.isLiked = !!threadLikesMap.get(thread._id.toString());
      thread.isSaved = !!savedThreadsMap.get(thread._id.toString());
      thread.user = user;
      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      delete thread.user_id;
      delete thread.latestComments;
    });

    return ControllerResponse(res, 200, threadsWithUserDetails);


  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

