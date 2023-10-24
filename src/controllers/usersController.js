const express = require("express");
const { signup, login, verifyEmailExists, verifyUsernameExists } = require("../services/usersServices");
const router = express.Router();

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/verify-email-exists").get(verifyEmailExists);
router.route("/verify-username-exists").get(verifyUsernameExists);
module.exports = router;
