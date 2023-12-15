const Users = require("../models/usersModel");
const { hashPassword, verifyPassword } = require("../routes/encryption");
const BigPromise = require("../middlewares/bigPromise");
const jwt = require("../utils/jwtService");
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
    const access_token = jwt.sign({
      _id: user._id,
      phone_number,
      email });
    const refresh_token = jwt.sign(
      {
        _id: user._id,
        phone_number,
        email

      },
      "30d",
      process.env.REFRESH_TOKEN_KEY
    );

    // store refresh token in database
    await RefreshToken.create({ token: refresh_token });


    delete user._doc.password;
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
      phone_number:user.phone_number,
      email:user.email
    });

    const refresh_token = jwt.sign(
      {
        _id: user._id,
        phone_number: user.phone_number,
        email: user.email
      },
      "30d",
      process.env.REFRESH_TOKEN_KEY
    );
    await RefreshToken.create({ token: refresh_token });

    delete user._doc.password;
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

module.exports.fetchUserDetails = BigPromise(async (req, res) => {
  try {
    const user = await Users.findById(req.user._id);
    delete user._doc.password;
    return ControllerResponse(res, 200, {
      ...user._doc,
    });

  } catch (err) {
    console.log(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});

module.exports.updateUserProfile = BigPromise(async (req, res) => {
  const { _id } = req.user;
  const updateData = req.body; 
  try {
    const user = await Users.findById(_id);
    if (!user) {
      return ErrorHandler(res, 404, "User not found");
    }
    if (updateData.name) {
      user.name = updateData.name;
    }
    if (updateData.username) {
      user.username = updateData.username;
    }
    if (updateData.phone_number) {
      user.phone_number = updateData.phone_number;
    }
    if (updateData.occupation) {
      user.occupation = updateData.occupation;
    }
    if (updateData.country) {
      user.country = updateData.country;
    }
    if (updateData.dob) {
      user.dob = Date.parse(updateData.dob);
    }
    if (updateData.profile_pic) {
      user.profile_pic = updateData.profile_pic;
    }
    await user.save();
    delete user._doc.password;
    return ControllerResponse(res, 200, {
      message: "Profile updated successfully",
      ...user._doc,
    });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, "Internal Server Error");
  }
});
module.exports.fetchAllActivities = BigPromise(async (req, res) => {
  try {
    const { userId } = req.query; // Assuming this is the logged-in user's ID

    const followRequestCount = await Follow.countDocuments({ followed_to: userId, is_confirmed: false });

    // Fetch the latest two follow requests
    const latestFollowRequests = await Follow.find(
      { followed_to: userId, is_confirmed: false },
      null,
      { sort: { createdAt: -1 }, limit: 2 }
    );

    // Initialize arrays to store profile pictures and names
    const profilePics = [];
    const names = [];

    // Iterate through the latest follow requests
    for (const followRequest of latestFollowRequests) {
      // Fetch the user's details based on the follow request
      const user = await Users.findById(followRequest.followed_by);

      // Check if the user and their profile picture exist
      if (user && user.profile_pic) {
        profilePics.push(user.profile_pic);
        names.push(user.name);
      }
    }

    // Now, profilePics and names arrays contain the latest two profile pictures and names
    ControllerResponse(res, 200, { profilePics, names, followRequestCount });
  } catch (err) {
    console.error(err);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

module.exports.fetchAllFollowRequest = BigPromise(async (req, res) => {
  try {
    const user_id = req.user._id;
    const followRequests = await Follow.find({ followed_to: user_id, is_confirmed: false });
    const data = [];
    for (const Request of followRequests) {
      const user = await Users.findById(Request.followed_by);

      if (user) {
        const userData = {
          Name: user.name,
          UserName: user.username,
          Occupation: user.occupation,
          ProfilePic: user.profile_pic,
        };
        data.push(userData);
      }
    }
    ControllerResponse(res, 200, data);
  } catch (error) {
    console.error(error);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

// Search for users by username, name, or email
module.exports.searchAPI = BigPromise(async (req, res) => {
  try {
    const { query } = req.query; // Get the search query from the request query parameter

    if (!query) {
      return ErrorHandler(res, 400, 'Search field is required.');
    }

    // Define the fields you want to retrieve
    const projection = {
      username: 1,
      name: 1,
      profile_pic: 1,
      occupation: 1,
    };

    // Use a regular expression to perform a case-insensitive search on multiple fields
    const users = await Users.find(
      {
        $or: [
          { username: { $regex: new RegExp(query, 'i') } },
          { name: { $regex: new RegExp(query, 'i') } },
          { email: { $regex: new RegExp(query, 'i') } },
        ],
      },
      projection // Apply the projection to retrieve specific fields
    );

    if (users.length === 0) {
      return ErrorHandler(res, 404, 'No users found for the given query.');
    }

    ControllerResponse(res, 200, users);
  } catch (error) {
    console.error(error);
    ErrorHandler(res, 500, 'Internal Server Error');
  }
});

