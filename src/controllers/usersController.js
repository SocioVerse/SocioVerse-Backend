const express = require("express");
const { signup, login, verifyEmailExists} = require("../services/usersServices");
const router = express.Router();

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/verify-email-exists").get(verifyEmailExists);
module.exports = router;
