const Users = require("../models/usersModel");
const { hashPassword, verifyPassword } = require("../routes/encryption");
const BigPromise = require("../middlewares/bigPromise");
const jwt = require("../utils/jwtService");
const { default: mongoose } = require("mongoose");
const otpGenerator = require("otp-generator");
const FirebaseAdminService = require("../utils/adminFireBaseService");
const EmailSerivce = require("../config/nodeMailer");
const EmailTemplates = require("../constants/emailTemplates");
const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");
const RefreshToken = require("../models/refreshToken");
const OtpVerification = require("../models/emailVerification");
const Follow = require("../models/follows");
const Thread = require("../models/threadsModel");
const RepostedThread = require("../models/repostedThread");
const ThreadLikes = require("../models/threadLikes");
const FeedLikes = require("../models/feedLikesModel");
const FeedComments = require("../models/feedComments");
const FeedCommentsLikes = require("../models/feedCommentLike");
const ThreadSaves = require("../models/threadSaves");
const FeedSaves = require("../models/feedSavesModel");
const DeviceFCMToken = require("../models/deviceFcmTocken");
const Story = require("../models/storyModel");
const StorySeen = require("../models/storySeens");
const StoryLike = require("../models/storyLikes");
const Room = require("../models/chatRoomModel");
const Message = require("../models/messageModel");
const Feed = require("../models/feedModel");
const Hashtag = require("../models/hashtagModel");
const Location = require("../models/locationModel");
const e = require("express");
const { default: axios } = require("axios");

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
    fcmToken,
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
    await RefreshToken({ token: refresh_token }).save();
    await DeviceFCMToken({
      user_id: user._id,
      fcm_token: fcmToken,
    }).save();
    delete user._doc.password;

    //Add image to faceDataSet
    if (face_image_dataset != null && user.face_image_dataset.length > 0) {
      response = await axios
        .post(
          `https://j007acky-facerecog.hf.space/user/`
          , {
            image_url: face_image_dataset[0],
            user_name: user._id,
          }
        );
    }
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
  const { usernameOrEmail, password, fcmToken, email, otp } = req.body;
  if ((!usernameOrEmail || !password) && (!email || !otp)) {
    return ErrorHandler(res, 400, "Username/Email and password are required");
  }
  try {
    const query = usernameOrEmail ?? email;

    const user = await Users.findOne({
      $or: [{ username: query }, { email: query }],
    });

    if (!user) {
      return ErrorHandler(res, 400, "Invalid credentials");
    }
    console.log(user);
    if (password == null && otp != null) {

      const otpVerification = await OtpVerification.findOne({
        email: email,
        otp,

      }).sort({ createdAt: -1 });

      if (!otpVerification) {
        return ErrorHandler(res, 400, "Invalid or expired OTP");
      }

      await OtpVerification.deleteOne({ _id: otpVerification._id });
    } else {
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return ErrorHandler(res, 400, "Invalid credentials");
      }
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
    await RefreshToken({ token: refresh_token }).save();
    await DeviceFCMToken({
      user_id: user._id,
      fcm_token: fcmToken,
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
      return ErrorHandler(res, 400, "Email already exists");
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
    await Users.findByIdAndUpdate(_id, updateData);

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

module.exports.fetchActivity = BigPromise(async (req, res) => {
  // -> Likes(thread, story, Feed) Collective
  //   -> Comment(thread, story, Feed) Collective
  //     -> comment likes
  //       -> Add Socket when any of the above event occur
  try {
    if (req.query.type == "likes") {
      const allThreads = await Thread.find({ user_id: req.user._id, like_count: { $gt: 0 } })
      const allFeeds = await Feed.find({ user_id: req.user._id, like_count: { $gt: 0 } })
      const allStories = await Story.find({ user_id: req.user._id, like_count: { $gt: 0 } })
      console.log(allThreads, allFeeds, allStories);
      const allThreadLikes = await Promise.all(allThreads.map(async (thread) => {
        const recentLikes = await ThreadLikes.find({ thread_id: thread._id, liked_by: { $ne: req.user._id } }, { liked_by: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(2);
        const users = await Users.find({ _id: { $in: recentLikes.map(like => like.liked_by) } }, { _id: 1, profile_pic: 1 });
        return { type: 'Thread', thread, users, latestLike: recentLikes[0].createdAt };
      }));

      const allFeedLikes = await Promise.all(allFeeds.map(async (feed) => {
        const recentLikes = await FeedLikes.find({ feed_id: feed._id, liked_by: { $ne: req.user._id } }, { liked_by: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(2);
        const users = await Users.find({ _id: { $in: recentLikes.map(like => like.liked_by) } }, { _id: 1, profile_pic: 1 });
        return { type: 'Feed', feed, users, latestLike: recentLikes[0].createdAt };
      }))
      const allStoryLikes = await Promise.all(allStories.map(async (story) => {
        const recentLikes = await StoryLike.find({ story_id: story._id, liked_by: { $ne: req.user._id } }, { liked_by: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(2);
        const users = await Users.find({ _id: { $in: recentLikes.map(like => like.liked_by) } }, { _id: 1, profile_pic: 1 });

        return { type: 'Story', story, users, latestLike: Date(recentLikes[0].createdAt) };
      }))
      //sort by latest like
      allLikes = allThreadLikes.concat(allFeedLikes, allStoryLikes).sort((a, b) => b.latestLike - a.latestLike);
      ControllerResponse(res, 200, allLikes);
      return
    } else if (req.query.type == "comments") {
      const allThreads = await Thread.find({ user_id: req.user._id, comment_count: { $gt: 0 } })
      const allFeeds = await Feed.find({ user_id: req.user._id, comment_count: { $gt: 0 } })
      console.log(allThreads, allFeeds);
      const allThreadComments = await Promise.all(allThreads.map(async (thread) => {
        const recentComments = await Thread.find({ parent_thread: thread._id, user_id: { $ne: req.user._id } }, { user_id: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(2);
        const users = await Users.find({ _id: { $in: recentComments.map(comment => comment.user_id) } }, { _id: 1, profile_pic: 1 });
        return { type: 'Thread', thread, users, latestComment: recentComments[0].createdAt };
      }));

      const allFeedComments = await Promise.all(allFeeds.map(async (feed) => {
        const recentComments = await FeedComments.find({ parent_feed: feed._id, user_id: { $ne: req.user._id } }, { user_id: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(2);
        const users = await Users.find({ _id: { $in: recentComments.map(comment => comment.user_id) } }, { _id: 1, profile_pic: 1 });
        return { type: 'Feed', feed, users, latestComment: recentComments[0].createdAt };
      })
      )

      allComments = allThreadComments.concat(allFeedComments).sort((a, b) => b.latestComment - a.latestComment);
      ControllerResponse(res, 200, allComments);
    } else if (req.query.type == "others") {
      const feedCommentsLikes = await FeedComments.find({ user_id: req.user._id, like_count: { $gt: 0 } });
      const feedComments = await FeedComments.find({ user_id: req.user._id, comment_count: { $gt: 0 } });
      const allFeedCommentLikes = await Promise.all(feedCommentsLikes.map(async (comment) => {
        const recentLikes = await FeedCommentsLikes.find({
          comment_id: comment._id,
          liked_by: { $ne: req.user._id },
        }, { liked_by: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(2);
        const users = await Users.find({ _id: { $in: recentLikes.map(like => like.liked_by) } }, { _id: 1, profile_pic: 1 });
        return { type: 'FeedCommentLikes', comment, users, latestLike: recentLikes[0].createdAt };
      }));
      const allFeedCommentReplies = await Promise.all(feedComments.map(async (comment) => {
        const recentComments = await FeedComments.find({
          comment_id: comment._id,
          parent_comment: { $ne: comment._id },
          user_id: { $ne: req.user._id },
        }, { liked_by: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(2);
        const users = await Users.find({ _id: { $in: recentComments.map(comment => comment.user_id) } }, { _id: 1, profile_pic: 1 });
        return { type: 'FeedCommentReplies', comment, users, latestLike: recentComments[0].createdAt };
      }));
      const allOthers = allFeedCommentReplies.concat(allFeedCommentLikes).sort((a, b) => b.latestComment - a.latestComment);
      ControllerResponse(res, 200, allOthers);
    }
  } catch (error) {
    console.error(error);
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
    const hiddenFeatures = await Users.findById(req.user._id, { story_hide_from: 1 });

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
          email: 1,
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

module.exports.searchUserByFace = BigPromise(async (req, res) => {
  try {
    const { faceImage } = req.query;
    console.log(faceImage);
    const response = await axios
      .post(
        `https://j007acky-facerecog.hf.space/`
        , {
          image_url: faceImage,
        }
      );

    ControllerResponse(res, 200, response.data);
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
        $unwind: "$user",
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
        $unwind: "$user",
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
module.exports.toggleRepostThread = BigPromise(async (req, res) => {
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
    const fcmTokens = await DeviceFCMToken.find(
      {
        $and: [
          { user_id: thread.user_id },
          { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } },
        ],
      },
      { fcm_token: 1, user_id: 1 }
    );
    console.log(fcmTokens);
    if (fcmTokens.length > 0)
      await FirebaseAdminService.sendNotifications({
        fcmTokens: fcmTokens.map((fcmToken) => fcmToken.fcm_token),
        notification: "Repost",
        body: user.username + " just reposted your thread",
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
    }).distinct("followed_to");

    // Fetch threads with comments
    const threadsWithUserDetails = await Thread.aggregate([
      {
        $match: {
          user_id: { $in: followingUsers },
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

    const commentUsers = await Users.find(
      { _id: { $in: Array.from(commentUserIds) } },
      { _id: 1, profile_pic: 1 }
    );

    const commentUserMap = new Map(
      commentUsers.map((user) => [user._id.toString(), user])
    );

    // Fetch user details for threads
    const threadUserIds = threadsWithUserDetails.map(
      (thread) => thread.user_id
    );

    const threadIds = threadsWithUserDetails.map((thread) => thread._id);

    const [users, threadLikes, reposts, saves] = await Promise.all([
      Users.find(
        { _id: { $in: threadUserIds } },
        { _id: 1, username: 1, occupation: 1, profile_pic: 1 }
      ),
      ThreadLikes.find({
        liked_by: req.user._id,
        thread_id: { $in: threadIds },
      }),
      RepostedThread.find({
        reposted_by: req.user._id,
        thread_id: { $in: threadIds },
      }),
      ThreadSaves.find({
        saved_by: req.user._id,
        thread_id: { $in: threadIds },
      }),
    ]);

    const threadLikesMap = new Map(
      threadLikes.map((like) => [like.thread_id.toString(), true])
    );
    const repostsMap = new Map(
      reposts.map((repost) => [repost.thread_id.toString(), true])
    );
    const savedThreadsMap = new Map(
      saves.map((savedThread) => [savedThread.thread_id.toString(), true])
    );
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    console.log(saves);
    // Process threads and add necessary details
    const processedThreads = threadsWithUserDetails.map((thread) => {
      thread.isReposted = repostsMap.get(thread._id.toString()) || false;
      thread.isLiked = threadLikesMap.get(thread._id.toString()) || false;
      thread.isSaved = savedThreadsMap.get(thread._id.toString()) || false;
      const user = userMap.get(thread.user_id.toString());
      thread.user = {
        ...user.toObject(),
        isOwner: user._id.toString() === _id,
      };

      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic:
          commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
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
module.exports.fetchFollowingFeeds = BigPromise(async (req, res) => {


  try {
    const { _id } = req.user;
    // Fetch followingUserIds directly without aggregation
    const followingUsers = await Follow.find({
      followed_by: _id,
      is_confirmed: true,
    }).distinct('followed_to');

    // Fetch threads with comments
    const feedsWithUserDetails = await Feed.aggregate([
      {
        $match:
          { user_id: { $in: followingUsers } },

      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: "feedcomments",
          let: { parentFeedId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $and: [{ $eq: ["$$parentFeedId", "$parent_feed"] }, { $ne: ["$$parentFeedId", "$_id"] }] },
              }

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
    feedsWithUserDetails.forEach((feed) => {
      feed.latestComments.forEach((comment) => {
        commentUserIds.add(comment.user_id.toString());
      });
    });

    const commentUsers = await Users.find({ _id: { $in: Array.from(commentUserIds) } }, { _id: 1, profile_pic: 1 });

    const commentUserMap = new Map(commentUsers.map((user) => [user._id.toString(), user]));

    // Fetch user details for threads
    const feedUserIds = feedsWithUserDetails.map((feed) => feed.user_id);

    const feedIds = feedsWithUserDetails.map((feed) => feed._id);
    let alltags = [];

    feedsWithUserDetails.map(async (feed) => {
      if (feed.tags.length > 0)
        alltags = alltags.concat(feed.tags);
    });

    const [users, feedLikes, saves, tags, location] = await Promise.all([
      Users.find({ _id: { $in: feedUserIds } }, { _id: 1, username: 1, occupation: 1, profile_pic: 1 }),
      FeedLikes.find({ liked_by: req.user._id, feed_id: { $in: feedIds } }),
      FeedSaves.find({ saved_by: req.user._id, feed_id: { $in: feedIds } }),
      Hashtag.find({ _id: { $in: alltags } }),
      Location.find({ _id: { $in: feedsWithUserDetails.map(feed => feed.location) } }),
    ]);

    const feedLikesMap = new Map(feedLikes.map((like) => [like.feed_id.toString(), true]));
    const savedFeedsMap = new Map(saves.map((savedFeed) => [savedFeed.feed_id.toString(), true]));
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const tagsMap = new Map(tags.map((tag) => [tag._id.toString(), tag.hashtag]));
    const locationMap = new Map(location.map((loc) => [loc._id.toString(), loc.name]));

    console.log(saves);
    // Process feeds and add necessary details
    const processedFeeds = feedsWithUserDetails.map((feed) => {
      feed.isLiked = feedLikesMap.get(feed._id.toString()) || false;
      feed.isSaved = savedFeedsMap.get(feed._id.toString()) || false;
      const user = userMap.get(feed.user_id.toString());
      feed.user = { ...user.toObject(), isOwner: user._id.toString() === _id };
      feed.tags = feed.tags.map(tag => tagsMap.get(tag.toString()));
      feed.location = feed.location == null ? null : locationMap.get(feed.location.toString());

      feed.commentUsers = feed.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic: commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      delete feed.user_id;
      delete feed.latestComments;
      return feed;
    });

    ControllerResponse(res, 200, processedFeeds);
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
    } else {
      // Create a new follow request
      const followRequest = new Follow({
        followed_by: new mongoose.Types.ObjectId(requestingUserId),
        followed_to: new mongoose.Types.ObjectId(targetUserId),
        is_confirmed: false,
      });

      await followRequest.save();
      const user = await Users.findById(requestingUserId);
      const fcmTokens = await DeviceFCMToken.find(
        {
          $and: [
            { user_id: targetUserId },
            { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } },
          ],
        },
        { fcm_token: 1 }
      );
      console.log(fcmTokens);
      if (fcmTokens.length > 0)
        await FirebaseAdminService.sendNotifications({
          fcmTokens: fcmTokens.map((fcmToken) => fcmToken.fcm_token),
          notification: "New Request",
          body: user.username + " just send you a follow request",
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
    // const fcmTokens = await DeviceFCMToken.find({
    //   $and: [
    //     { user_id: targetUserId },
    //     { user_id: { $ne: new mongoose.Types.ObjectId(req.user._id) } }
    //   ]
    // }, { fcm_token: 1 });
    // console.log(fcmTokens);
    // if (fcmTokens.length > 0)
    //   await FirebaseAdminService.sendNotifications({
    //     fcmTokens: fcmTokens.map(
    //       (fcmToken) => fcmToken.fcm_token
    //     ), notification: "Request Accepted", body: user.username + " just accepted your follow request"
    //   });

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

    const hiddenFeatures = await Users.findById(req.user._id, { story_hide_from: 1 });
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
    user._doc.story_hidden = hiddenFeatures.story_hide_from.includes(userId);
    const threadsQuery = {
      user_id: new mongoose.Types.ObjectId(userId),
      isBase: true,
    };

    if (req.user._id.toString() != userId) {
      const isFollowing = await Follow.findOne({
        followed_by: req.user._id,
        followed_to: userId,
      });
      user._doc.state =
        isFollowing != null ? (isFollowing.is_confirmed == true ? 2 : 1) : 0;
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

    const commentUsers = await Users.find(
      { _id: { $in: Array.from(commentUserIds) } },
      { _id: 1, profile_pic: 1 }
    );

    const commentUserMap = new Map(
      commentUsers.map((user) => [user._id.toString(), user])
    );
    // Array of user IDs from threads
    const threadUserIds = threadsWithUserDetails.map(
      (thread) => thread.user_id
    );

    const users = new Map();
    for (const threadUserId of threadUserIds) {
      const user = await Users.findById(threadUserId, {
        _id: 1,
        username: 1,
        occupation: 1,
        profile_pic: 1,
      });
      users.set(threadUserId.toString(), user);
    }
    const threadIds = threadsWithUserDetails.map((thread) => thread._id);

    const threadLikes = await ThreadLikes.find({
      liked_by: req.user._id,
      thread_id: { $in: threadIds },
    });
    const reposts = await RepostedThread.find({
      reposted_by: req.user._id,
      thread_id: { $in: threadIds },
    });
    const savedThreads = await ThreadSaves.find({
      saved_by: req.user._id,
      thread_id: { $in: threadIds },
    });
    const threadLikesMap = new Map(
      threadLikes.map((like) => [like.thread_id.toString(), true])
    );
    const repostsMap = new Map(
      reposts.map((repost) => [repost.thread_id.toString(), true])
    );
    const savedThreadsMap = new Map(
      savedThreads.map((savedThread) => [
        savedThread.thread_id.toString(),
        true,
      ])
    );
    for (const thread of threadsWithUserDetails) {
      thread.isReposted = !!repostsMap.get(thread._id.toString());
      thread.isLiked = !!threadLikesMap.get(thread._id.toString());
      thread.isSaved = !!savedThreadsMap.get(thread._id.toString());
      const user = users.get(thread.user_id.toString());
      thread.user = {
        ...user.toObject(),
        isOwner: user._id.toString() === req.user._id,
      };
      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic:
          commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
      }));
      delete thread.user_id;
      delete thread.latestComments;
    }
    console.log({ user, threadsWithUserDetails });

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

module.exports.fetchUserFeeds = BigPromise(async (req, res) => {
  try {
    let isFollower = await Follow.countDocuments({
      followed_by: req.user._id,
      followed_to: req.query.userId ?? req.user._id,
      is_confirmed: true
    });
    if (req.query.userId == req.user._id)
      isFollower = true;
    const feeds = await Feed.find({
      user_id: req.query.userId ?? req.user._id,
      $or: [
        { is_private: isFollower ? true : false },
        { is_private: false }
      ]
    }, {
      user_id: 1,
      images: 1,
      is_private: 1,
      allow_comments: 1,
      allow_save: 1,
      createdAt: 1,
    }).sort({ createdAt: -1 });

    for (let i = 0; i < feeds.length; i++) {

      const user = await Users.findById(feeds[i].user_id,
        {
          _id: 1,
          username: 1,
          profile_pic: 1,
          occupation: 1,
          email: 1,
        });
      console.log(req.user._id === feeds[i].user_id._id ? true : false);
      feeds[i]._doc.user_id = {
        ...user._doc,
        isOwner: false
      };
    }
    ControllerResponse(res, 200, feeds);
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
}
);
module.exports.fetchRepostedThread = BigPromise(async (req, res) => {
  try {
    const userId = req.query.userId ?? req.user._id;
    const repostedThreadsIds = await RepostedThread.find({
      reposted_by: userId,
    }).select("thread_id");

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

    const commentUsers = await Users.find(
      { _id: { $in: Array.from(commentUserIds) } },
      { _id: 1, profile_pic: 1 }
    );

    const commentUserMap = new Map(
      commentUsers.map((user) => [user._id.toString(), user])
    );
    const threadIds = threadsWithUserDetails.map((thread) => thread._id);

    const [user, threadLikes, reposts, saves] = await Promise.all([
      Users.findById(userId, {
        _id: 1,
        username: 1,
        occupation: 1,
        profile_pic: 1,
      }),
      ThreadLikes.find({
        liked_by: req.user._id,
        thread_id: { $in: threadIds },
      }),
      RepostedThread.find({
        reposted_by: req.user._id,
        thread_id: { $in: threadIds },
      }),
      ThreadSaves.find({
        saved_by: req.user._id,
        thread_id: { $in: threadIds },
      }),
    ]);

    const threadLikesMap = new Map(
      threadLikes.map((like) => [like.thread_id.toString(), true])
    );
    const repostsMap = new Map(
      reposts.map((repost) => [repost.thread_id.toString(), true])
    );
    const savedThreadsMap = new Map(
      saves.map((savedThread) => [savedThread.thread_id.toString(), true])
    );

    threadsWithUserDetails.forEach((thread) => {
      thread.isReposted = !!repostsMap.get(thread._id.toString());
      thread.isLiked = !!threadLikesMap.get(thread._id.toString());
      thread.isSaved = !!savedThreadsMap.get(thread._id.toString());
      thread.user = user;
      thread.commentUsers = thread.latestComments.map((comment) => ({
        _id: comment.user_id,
        profile_pic:
          commentUserMap.get(comment.user_id.toString())?.profile_pic || null,
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

module.exports.fetchAllStories = BigPromise(async (req, res) => {
  try {
    const userId = req.user._id;
    const owner = await Users.findById(userId, {
      _id: 1,
      profile_pic: 1,
      username: 1,
      name: 1,
      occupation: 1,
      email: 1,
      story_hide_from: 1,
    });
    let followingUsers = await Follow.find({
      followed_by: userId,
      is_confirmed: true,
    });
    followingUsers = await Users.find({
      _id: { $in: followingUsers.map((user) => user.followed_to) },
      story_hide_from: { $ne: userId }
    });
    const followingUserIds = followingUsers.map((user) => user._id);
    followingUserIds.push(new mongoose.Types.ObjectId(userId));
    const stories = await Story.aggregate([
      {
        $match: {
          user_id: { $in: followingUserIds },

        },
      },
      {
        $group: {
          _id: "$user_id",
          user_id: { $first: "$user_id" },
          createdAt: { $first: "$createdAt" },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          "user._id": 1,
          "user.profile_pic": 1,
          "user.username": 1,
          "user.name": 1,
          "user.occupation": 1,
          "user.email": 1,
          _id: 0, // Exclude the default _id field
        },
      },
    ]);

    for (let i = 0; i < stories.length; i++) {
      stories[i].user.isOwner = stories[i].user._id.toString() == userId.toString();
      stories[i].user.isStoryHidden = owner.story_hide_from.includes(stories[i].user._id);
      const countOfStory = await Story.countDocuments({ user_id: stories[i].user._id });
      const countedStories = await Story.find({ user_id: stories[i].user._id });
      const countOfSeenStory = await StorySeen.countDocuments({
        seen_by: userId,
        story_id: { $in: countedStories.map((story) => story._id) },
      });
      console.log(countOfStory, countOfSeenStory);
      stories[i].is_all_seen = countOfStory == countOfSeenStory;
    }

    const ownerStory = stories.find((story) => story.user.isOwner);

    if (ownerStory) {
      stories.splice(stories.indexOf(ownerStory), 1);
      stories.sort((a, b) => b.is_all_seen - a.is_all_seen);
      stories.unshift(ownerStory);
    } else {
      stories.sort((a, b) => b.is_all_seen - a.is_all_seen);
      stories.unshift({
        user: { ...owner._doc, isOwner: true },
        is_all_seen: null,
      });
    }
    console.log(stories)
    ControllerResponse(res, 200, stories);
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.hideStory = BigPromise(async (req, res) => {
  try {
    const { hideFrom } = req.body;
    const userId = req.user._id;
    await Users.findByIdAndUpdate(userId,
      { $addToSet: { story_hide_from: hideFrom } });
    ControllerResponse(res, 200, "Story hidden successfully");

  }
  catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
module.exports.unhideStory = BigPromise(async (req, res) => {
  try {
    const { unhideFrom } = req.body;
    const userId = req.user._id;
    await Users.findByIdAndUpdate(userId,
      { $pull: { story_hide_from: unhideFrom } });
    ControllerResponse(res, 200, "Story unhidden successfully");
  }
  catch (err) {
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
module.exports.fetchAllStoriesSeens = BigPromise(async (req, res) => {
  try {
    const userId = req.user._id;
    const story_id = req.query.story_id;
    const story = await Story.findById(story_id);
    const seenBy = await StorySeen.find({ story_id: story });
    const users = [];
    let owner;
    for (const user of seenBy) {
      const userDetail = await Users.findById(user.seen_by, {
        _id: 1,
        profile_pic: 1,
        username: 1,
        name: 1,
        occupation: 1,
        email: 1,
      });
      //liked by user
      userDetail._doc.isLiked =
        (await StoryLike.findOne({
          liked_by: user.seen_by,
          story_id: story_id,
        })) != null;
      if (userDetail._doc._id.toString() == userId.toString()) {
        owner = userDetail._doc;
        owner.isOwner = true;
        continue;
      }
      userDetail._doc.isOwner = false;
      users.push(userDetail._doc);
    }
    users.sort((a, b) => b.isLiked - a.isLiked);
    users.unshift(owner);
    const likeCount = await StoryLike.countDocuments({ story_id: story_id });

    ControllerResponse(res, 200, { likeCount, users });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

// fetch all story hidden users
module.exports.fetchAllStoryHiddenUsers = BigPromise(async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await Users.findById(userId, {
      story_hide_from: 1,
    });
    const users = await Users.find({
      _id: { $in: user.story_hide_from },
    }, {
      _id: 1,
      profile_pic: 1,
      username: 1,
      name: 1,
      occupation: 1,
      email: 1,
    });
    ControllerResponse(res, 200, users);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.getRoomInfoByUser = BigPromise(async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await Users.findById(userId);
    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }
    const room = await Room.findOne({
      participants: { $all: [req.user._id, userId] },
    });
    console.log(room);
    if (!room) {

      return ControllerResponse(res, 200, { room: null, messages: [] });
    }

    const messages = await Message.aggregate([
      {
        $match: {
          room_id: new mongoose.Types.ObjectId(room._id),
          soft_delete: false,
        },
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sentBy",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $unwind: "$sender",
      },
      {
        $project: {
          "sender._id": 1,
          "sender.profile_pic": 1,
          "sender.username": 1,
          "sender.name": 1,
          "sender.occupation": 1,
          "sender.email": 1,
          _id: 1,
          message: 1,
          image: 1,
          thread: 1,
          feed: 1,
          profile: 1,
          story: 1,
          seenBy: 1,
          createdAt: 1,
        },
      },
    ]);
    const updatedMessages = messages.map((message) => {
      message.isSeenByAll = message.seenBy.length === room.participants.length;
      message.sender.isOwner =
        message.sender._id.toString() === req.user._id.toString();
      return message;
    });

    ControllerResponse(res, 200, { room, messages: updatedMessages });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
module.exports.createRoom = BigPromise(async (req, res) => {
  try {
    const { userId } = req.body;
    const newRoom = new Room({
      participants: [req.user._id, userId],
      isGroup: false,
    });
    await newRoom.save();
    ControllerResponse(res, 200, newRoom);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.allRecentChats = BigPromise(async (req, res) => {
  try {
    // req.user._id is present in participants array
    const rooms = await Room.find({
      participants: req.user._id,
    }).sort({ updatedAt: -1 });

    for (const room of rooms) {
      console.log(room)
      const user = room.participants.find(participant => participant.toString() !== req.user._id.toString());
      room._doc.isRequestMessage = await Follow.findOne({
        followed_by: user,
        followed_to: req.user._id,
        is_confirmed: true,
      }) == null && await Message.find({
        room_id: room.id,
        sentBy: req.user._id
      }).countDocuments() == 0
        ? true : false;
      console.log(user);
      room._doc.user = room.isGroup == false ? await Users.findById(user, {
        _id: 1,
        profile_pic: 1,
        username: 1,
        name: 1,
        occupation: 1,
        email: 1,
      }) : null;
      delete room._doc.participants;
      const lastMessage = await Message.findOne({
        _id: room.lastMessage,
      }, {
        _id: 1,
        message: 1,
        image: 1,
        thread: 1,
        createdAt: 1,
        sentBy: 1,
        updatedAt: 1,
      });

      room.lastMessage = lastMessage;

      const unreadMessages = await Message.countDocuments({
        room_id: room._id,
        soft_delete: false,
        seenBy: { $ne: req.user._id },
      });

      room._doc.unreadMessages = unreadMessages;
    }

    console.log(rooms);

    ControllerResponse(res, 200, rooms);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});


module.exports.searchLocation = BigPromise(async (req, res) => {
  try {
    const { query } = req.query;

    const locations = await Location.find({
      $or: [
        { name: { $regex: new RegExp("^" + query, "i") } },
        { country: { $regex: new RegExp("^" + query, "i") } },
        { state: { $regex: new RegExp("^" + query, "i") } },
      ],
    }).limit(10);
    const data = locations.map((feature) => ({
      _id: feature._id,
      name: feature.name,
      type: feature.type,
      country: feature.country,
      state: feature.state,
      post_count: feature.post_count,
      geometry: { "coordinates": [parseFloat(feature.latitude), parseFloat(feature.longitude)] },
    }));
    console.log(data);
    ControllerResponse(res, 200, data);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.searchHashtags = BigPromise(async (req, res) => {
  try {
    const { query } = req.query;
    const hashtags = await Hashtag.find({
      hashtag: {
        $regex: new RegExp("^" + query, "i")
      },

    }, {
      _id: 1,
      hashtag: 1,
      post_count: 1,
    }).limit(10);
    console.log(hashtags);
    ControllerResponse(res, 200, hashtags);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
module.exports.searchMetadata = BigPromise(async (req, res) => {
  try {
    const { query } = req.query;
    console.log(query);
    const feeds = await Feed.find({
      caption: new RegExp("^" + query, "i"),
      is_private: false,
    }, {
      user_id: 1,
      images: 1,
      is_private: 1,
      allow_comments: 1,
      allow_save: 1,
      created_at: 1,
    });
    for (let i = 0; i < feeds.length; i++) {
      const user = await Users.findById(feeds[i].user_id,
        {
          _id: 1,
          username: 1,
          profile_pic: 1,
          occupation: 1,
          email: 1,
        });
      console.log(req.user._id === feeds[i].user_id._id ? true : false);
      feeds[i]._doc.user_id = {
        ...user._doc,
        isOwner: false
      };
    }

    ControllerResponse(res, 200, feeds);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.getRecentRoomsInfo = BigPromise(async (req, res) => {
  try {

    const rooms = await Room.find({
      participants: { $in: [req.user._id] },
    }).sort({ updatedAt: -1 });
    const followingUsers = await Follow.find({
      followed_by: req.user._id,
      is_confirmed: true,
    }, {
      followed_to: 1,
      _id: 0
    });
    const followers = await Follow.find({
      followed_to: req.user._id,
      is_confirmed: true,
    }, {
      followed_by: 1,
      _id: 0
    });
    const followedToList = new Set(followingUsers.map(user => user.followed_to.toString()));
    const followingUsersList = new Set(followers.map(user => user.followed_by.toString()));

    console.log(followingUsersList, followedToList);
    const allUsers = new Set([...followedToList, ...followingUsersList]);
    for (const room of rooms) {
      const user = room.participants.find(participant => participant.toString() !== req.user._id.toString());
      allUsers.add(user);
    }
    const users = await Users.find({
      _id: { $in: Array.from(allUsers) }
    }, {
      _id: 1,
      name: 1,
      username: 1,
      profile_pic: 1,
      occupation: 1,
      email: 1,
    });
    console.log(users);
    ControllerResponse(res, 200, users);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});


module.exports.getRoomId = BigPromise(async (req, res) => {
  try {
    const { userId } = req.query;
    const room = await Room.findOne({
      participants: { $all: [req.user._id, userId] },
    });
    if (!room) {
      // Create a new room
      const newRoom = new Room({
        participants: [req.user._id, userId],
        isGroup: false,
      });

      await newRoom.save();
      ControllerResponse(res, 200, newRoom);
      return;
    }
    ControllerResponse(res, 200, room);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.changePassword = BigPromise(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const

      user = await Users.findById(req.user._id);
    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }
    if (oldPassword != null) {
      const isMatch = await verifyPassword(oldPassword, user.password);
      if (!isMatch) {
        return ControllerResponse(res, 200,
          {
            message: "Old password is incorrect",
            success: false

          }
        );
      }
    }
    user.password = await hashPassword(newPassword);
    await user.save();
    ControllerResponse(res, 200, {
      message: "Password changed successfully",
      success: true
    });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
}
);

module.exports.removeFollowers = BigPromise(async (req, res) => {

  try {
    const { userId } = req.query;
    const user = await Users.findById(userId);
    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }
    await Follow.deleteOne({
      followed_by: userId,
      followed_to: req.user._id,
    });
    await Users.updateOne(
      { _id: userId },
      { $inc: { following_count: -1 } }
    );
    await Users.updateOne(
      { _id: req.user._id },
      { $inc: { followers_count: -1 } }
    );
    ControllerResponse(res, 200, "Follower removed successfully");
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.generateEmailOtp = BigPromise(async (req, res) => {
  try {
    const { email, isSignup } = req.query;
    const verificationOTP = otpGenerator.generate(4, {
      upperCase: false,
      specialChars: false,
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,

    });
    await OtpVerification.create({
      email: email,
      otp: verificationOTP,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), //Expiration to 10 minutes from now
    });
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Email Verification OTP",
      html: isSignup == true ? EmailTemplates.registerTemplate(verificationOTP) :
        EmailTemplates.forgotPasswordTemplate(verificationOTP)
    };


    await EmailSerivce.sendMail(mailOptions);

    return ControllerResponse(
      res,
      200,
      "OTP generated successfully. Verification email sent."
    );
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error", err);
  }
});

module.exports.verifyEmailOtp = BigPromise(async (req, res) => {
  try {
    const { email, otp } = req.query;
    const otpVerification = await OtpVerification.findOne({
      email: email,
      otp,
    }).sort({ createdAt: -1 });

    if (!otpVerification) {
      return ErrorHandler(res, 400, "Invalid or expired OTP");
    }

    await OtpVerification.deleteOne({ _id: otpVerification._id });

    return ControllerResponse(res, 200, true);
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
