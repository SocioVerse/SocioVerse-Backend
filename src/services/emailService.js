const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const Users = require("../models/usersModel");
const OtpVerification = require("../models/emailVerification");
const BigPromise = require("../middlewares/bigPromise");
const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports.generateOtp = BigPromise(async (req, res) => {
  try {
    const { email } = req.body;
    let user = await Users.findOne({ email });
    if (!user) {
      user = await Users.create({
        email,
        email_verified: false,
      });
    }
    const verificationOTP = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
    });
    const otpVerification = await OtpVerification.create({
      user: user._id,
      otp: verificationOTP,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), //Expiration to 15 minutes from now
    });
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Email Verification OTP",
      text: `Your OTP for email verification is: ${verificationOTP}`,
    };

    await transporter.sendMail(mailOptions);

    return ControllerResponse(
      res,
      200,
      "OTP generated successfully. Verification email sent."
    );
  } catch (err) {
    ErrorHandler(res, 500, "Internal Server Error", err);
  }
});

module.exports.verifyOtp = BigPromise(async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await Users.findOne({ email });

    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }
    const otpVerification = await OtpVerification.findOne({
      user: user._id,
      otp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpVerification) {
      return ErrorHandler(res, 400, "Invalid or expired OTP");
    }
    user.email_verified = true;
    await user.save();
    await OtpVerification.deleteOne({ _id: otpVerification._id });

    return ControllerResponse(res, 200, "Email verified successfully");
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
