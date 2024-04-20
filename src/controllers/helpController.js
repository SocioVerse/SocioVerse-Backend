const express = require("express");
const router = express.Router();
const {
    addReport,
} = require("../services/reportServices");
const { auth } = require("../middlewares/auth");
router.route("/create-report").post(auth, addReport);

module.exports = router;