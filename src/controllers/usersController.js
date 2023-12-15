const express = require("express");
const {
    signup,
    login,
    verifyEmailExists,
    verifyUsernameExists,
    fetchUserDetails,
    fetchFollowers,
    fetchFollowing,
    repostThread,
    createFollowRequest,
    confirmFollowRequest,
    fetchFollowingThreads,
    deleteFollowRequest,
    updateUserProfile,
    fetchLatestFollowRequests,
    fetchAllFollowRequest,

    searchAPI,
} = require("../services/usersServices");
const router = express.Router();
const auth = require("../middlewares/auth");


// public apis
router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/verify-email-exists").get(verifyEmailExists);
router.route("/verify-username-exists").get(verifyUsernameExists);


// private apis 
router.route("/fetch-user-details").get(auth, fetchUserDetails);
router.route("/update-user-profile").put(auth, updateUserProfile);
router.route("/create-follow-request").post(auth, createFollowRequest);
router.route("/confirm-follow-request").put(auth, confirmFollowRequest);
router.route("/delete-follow-request").delete(auth, deleteFollowRequest);
router.route("/fetch-followers").get(auth, fetchFollowers);
router.route("/fetch-following").get(auth, fetchFollowing);
router.route("/fetch-following-threads").get(auth, fetchFollowingThreads);
router.route("/fetch-latest-follow-request").get(auth, fetchLatestFollowRequests);
router.route("/repost-thread").post(auth, repostThread);
router.route("/fetch-all-follow-request").get(auth,fetchAllFollowRequest);
router.route("/search-user").get(auth,searchAPI);
module.exports = router;
 