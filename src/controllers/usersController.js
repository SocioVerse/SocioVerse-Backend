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
    toogleRepostThread,
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
    fetchUserFeeds,
    fetchAllStories,
    fetchAllStoriesSeens,
    getRoomInfoByUser,
    searchMetadata,
    allRecentChats,
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
router.route("/toogle-repost-thread").post(auth, toogleRepostThread);
router.route("/fetch-all-follow-request").get(auth, fetchAllFollowRequest);
router.route("/fetch-all-stories").get(auth, fetchAllStories);
router.route("/fetch-all-stories-seens").get(auth, fetchAllStoriesSeens);

//search api
router.route("/search-user").get(auth, searchAPI);
router.route("/search-user-by-face").get(auth, searchUserByFace);
router.route("/search-location").get(auth, searchLocation);
router.route("/search-hashtags").get(auth, searchHashtags);
router.route("/search-metadata").get(auth, searchMetadata);

//user profile apis
router.route("/fetch-user-profile-details").get(auth, fetchUserProfileDetails);
router.route("/fetch-user-feeds").get(auth, fetchUserFeeds);
router.route("/fetch-reposted-thread").get(auth, fetchRepostedThread);
router.route("/add-bio").post(auth, addBio);

//chat apis
router.route("/get-room-info-by-user").get(auth, getRoomInfoByUser);
router.route("/all-recent-chats").get(auth, allRecentChats);


module.exports = router;
