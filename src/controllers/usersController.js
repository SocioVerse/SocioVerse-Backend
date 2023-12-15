const express = require("express");
const {
    signup,
    login,
    verifyEmailExists,
    verifyUsernameExists,
    fetchUserDetails,
    updateUserProfile,
    fetchAllActivities,
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
router.route("/fetch-all-activities").get(auth, fetchAllActivities);
router.route("/fetch-all-follow-request").get(auth,fetchAllFollowRequest);
router.route("/search-user").get(auth,searchAPI);
module.exports = router;
