const Users = require("../models/usersModel");
const { encryptData, decryptData } = require("../routes/encryption");
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
    // res.status(400).json({ message: "Invalid Email" })
    return ErrorHandler(res, 400, "Invalid Email");
  }
  if (password == null || password == undefined || password.length < 6) {
    // res.status(400).json({ message: "Invalid Password" })
    return ErrorHandler(res, 500, "Invalid Password");
  }
  const userExist = await Users.findOne({ email });
  if (userExist) {
    // res.status(400).json({ message: "Email already exists" })
    return ErrorHandler(res, 500, "Email already exists");
  }
  try {
    const newUser = new Users({
      email,
      password: encryptData(password),
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
      message: "Login Successfull!",
      ...savedUser._doc,
      refresh_token,
      access_token,
    });
  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
