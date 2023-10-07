const Users = require("../models/usersModel");
const { hashPassword, verifyPassword } = require("../routes/encryption");
const BigPromise = require("../middleware/bigPromise");
const jwt = require("../routes/jwtService");
const {
  ControllerResponse,
  ErrorHandler,
} = require("../helper/customResponse");
const RefreshToken = require("../models/refreshToken");

function checkEmail(email) {
  if (email == null || email == undefined) {
    return false;
  }
  if (email.length < 3) {
    return false;
  }
  if (email.indexOf("@") == -1) {
    return false;
  }
  if (email.indexOf(".") == -1) {
    return false;
  }
  return true;
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
  try {
    const newUser = new Users({
      email,
      password: await hashPassword(password),
      name,
      phone_number,
      username,
      occupation,
      country,
      dob: Date.parse(dob),
    });
    const savedUser = await newUser.save();
    const access_token = jwt.sign({ id: savedUser._id, phone_number });
    const refresh_token = jwt.sign(
      {
        id: savedUser._id,
        phone_number,
      },
      "30d",
      process.env.REFRESH_TOKEN_KEY
    );

    // store refresh token in database
    await RefreshToken.create({ token: refresh_token });

    return ControllerResponse(res, 200, {
      message: "Signup Successfull!",
      ...savedUser._doc,
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
      return ErrorHandler(res, 401, "Invalid credentials");
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return ErrorHandler(res, 401, "Invalid credentials");
    }
    const access_token = jwt.sign({
      id: user._id,
      phone_number: user.phone_number,
    });

    const refresh_token = jwt.sign(
      {
        id: user._id,
        phone_number: user.phone_number,
      },
      "30d",
      process.env.REFRESH_TOKEN_KEY
    );
    await RefreshToken.create({ token: refresh_token });

    return ControllerResponse(res, 200, {
      message: "Login Successful!",
      access_token,
      refresh_token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone_number: user.phone_number,
        username: user.username,
        occupation: user.occupation,
        country: user.country,
        dob: user.dob,
      },
    });
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
