const Users = require("../models/usersModel");
const { hashPassword, verifyPassword } = require("../routes/encryption");
const BigPromise = require("../middlewares/bigPromise");
const jwt = require("../utils/jwtService");
const imgService = require("../routes/imageServices");
const {
  ControllerResponse,
  ErrorHandler,
} = require("../helpers/customResponse");
const RefreshToken = require("../models/refreshToken");

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
    });
    user.save();
    const access_token = jwt.sign({ _id: user._id, phone_number });
    const refresh_token = jwt.sign(
      {
        _id: user._id,
        phone_number,
      },
      "30d",
      process.env.REFRESH_TOKEN_KEY
    );

    // store refresh token in database
    await RefreshToken.create({ token: refresh_token });

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
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return ErrorHandler(res, 400, "Username/Email and password are required");
  }
  try {
    const user = await Users.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      return ErrorHandler(res, 403, "Invalid credentials");
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return ErrorHandler(res, 403, "Invalid credentials");
    }
    const access_token = jwt.sign({
      _id: user._id,
      phone_number: user.phone_number,
    });

    const refresh_token = jwt.sign(
      {
        _id: user._id,
        phone_number: user.phone_number,
      },
      "30d",
      process.env.REFRESH_TOKEN_KEY
    );
    await RefreshToken.create({ token: refresh_token });

    return ControllerResponse(res, 200, {
      message: "Login Successful!",
      ...user._doc,
      refresh_token,
      access_token
    });
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.verifyEmailExists = BigPromise(async (req, res) => {
  try {
    const { email } = req.query;
    const user = await Users.findOne({ email: email });
    return ControllerResponse(res, 200, {
      email_exists: user ? true : false,
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