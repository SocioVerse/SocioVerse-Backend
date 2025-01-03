const express = require("express");
const {
    signup,
    login,
    logout,
    verifyEmailExists,
    verifyUsernameExists,
    fetchUserDetails,
    fetchFollowers,
    fetchFollowing,
    toggleRepostThread,
    createFollowRequest,
    confirmFollowRequest,
    fetchFollowingThreads,
    fetchFollowingFeeds,
    deleteFollowRequest,
    updateUserProfile,
    fetchLatestFollowRequests,
    fetchAllFollowRequest,
    unFollowUser,
    fetchUserProfileDetails,
    addBio,
    searchAPI,
    searchUserByFace,
    searchLocation,
    searchHashtags,
    fetchRepostedThread,
    fetchActivity,
    fetchUserFeeds,
    fetchAllStories,
    fetchAllStoriesSeens,
    getRoomInfoByUser,
    createRoom,
    searchMetadata,
    allRecentChats,
    hideStory,
    unhideStory,
    getRoomId,
    getRecentRoomsInfo,
    unreadMessageCount,
    fetchAllStoryHiddenUsers,
    changePassword,
    removeFollowers,
    generateEmailOtp,
    verifyEmailOtp,
} = require("../services/usersServices");
const router = express.Router();
const { auth } = require("../middlewares/auth");

// PUBLIC APIs
router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/verify-email-exists").get(verifyEmailExists);
router.route("/verify-username-exists").get(verifyUsernameExists);

// PRIVATE APIs

router.route("/logout").delete(auth, logout);

//follow apis
router.route("/fetch-user-details").get(auth, fetchUserDetails);
router.route("/update-user-profile").put(auth, updateUserProfile);
router.route("/create-follow-request").post(auth, createFollowRequest);
router.route("/confirm-follow-request").put(auth, confirmFollowRequest);
router.route("/delete-follow-request").delete(auth, deleteFollowRequest);
router.route("/unfollow-user").delete(auth, unFollowUser);
router.route("/fetch-followers").get(auth, fetchFollowers);
router.route("/fetch-following").get(auth, fetchFollowing);
router.route("/fetch-following-threads").get(auth, fetchFollowingThreads);
router.route("/fetch-following-feeds").get(auth, fetchFollowingFeeds);
router.route("/fetch-latest-follow-request").get(auth, fetchLatestFollowRequests);
router.route("/toggle-repost-thread").post(auth, toggleRepostThread);
router.route("/fetch-all-follow-request").get(auth, fetchAllFollowRequest);
router.route("/get-activity").get(auth, fetchActivity);
router.route("/remove-follower").delete(auth, removeFollowers);


//search api
router.route("/search-user").get(auth, searchAPI);
router.route("/search-user-by-face").post(auth, searchUserByFace);
router.route("/search-location").get(auth, searchLocation);
router.route("/search-hashtags").get(auth, searchHashtags);
router.route("/search-metadata").get(auth, searchMetadata);

//user profile apis
router.route("/fetch-user-profile-details").get(auth, fetchUserProfileDetails);
router.route("/fetch-user-feeds").get(auth, fetchUserFeeds);
router.route("/fetch-reposted-thread").get(auth, fetchRepostedThread);
router.route("/add-bio").post(auth, addBio);
router.route("/change-password").post(auth, changePassword);
router.route("/generate-otp").get(generateEmailOtp);
router.route("/verify-otp").get(verifyEmailOtp);


//chat apis
router.route("/get-room-info-by-user").get(auth, getRoomInfoByUser);
router.route("/create-room").post(auth, createRoom);
router.route("/all-recent-chats").get(auth, allRecentChats);
router.route("/unread-message-count").get(auth, unreadMessageCount);

//story apis
router.route("/fetch-all-stories").get(auth, fetchAllStories);
router.route("/fetch-all-stories-seens").get(auth, fetchAllStoriesSeens);
router.route("/hide-story").post(auth, hideStory);
router.route("/unhide-story").post(auth, unhideStory);
router.route("/fetch-all-story-hidden-users").get(auth, fetchAllStoryHiddenUsers);

//chat apis
router.route("/get-recent-rooms-info").get(auth, getRecentRoomsInfo);
router.route("/get-room-id").get(auth, getRoomId);
module.exports = router;
