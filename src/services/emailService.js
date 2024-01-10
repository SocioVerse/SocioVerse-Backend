const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const Users = require("../models/usersModel");
const OtpVerification = require("../models/emailVerification");
const BigPromise = require("../middlewares/bigPromise");
const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "socioverse.io@gmail.com",
    pass: "jzac chay rkvv wrpb",
  },
});

module.exports.generateOtp = BigPromise(async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the user already exists
    let user = await Users.findOne({ email });

    // If the user doesn't exist, create a temporary user record
    if (!user) {
      user = await Users.create({
        email,
        email_verified: false,
      });
    }

    // Generate OTP
    const verificationOTP = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
    });

    // Save OTP and expiration in the OTP verification model
    const otpVerification = await OtpVerification.create({
      user: user._id,
      otp: verificationOTP,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Set expiration to 15 minutes from now
    });

    // Send verification email
    const mailOptions = {
      from: "socioverse.io@gmail.com",
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

    // Find the user
    const user = await Users.findOne({ email });

    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }

    // Find the latest OTP verification record for the user
    const otpVerification = await OtpVerification.findOne({
      user: user._id,
      otp,
      expiresAt: { $gt: new Date() }, // Check if the OTP is not expired
    });

    if (!otpVerification) {
      return ErrorHandler(res, 400, "Invalid or expired OTP");
    }

    // Mark email as verified in the Users model
    user.email_verified = true;
    await user.save();

    // Remove the used OTP verification record
    await OtpVerification.deleteOne({ _id: otpVerification._id });

    return ControllerResponse(res, 200, "Email verified successfully");
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
