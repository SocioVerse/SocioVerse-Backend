const { ErrorHandler } = require("../helpers/customResponse");
const bigPromise = require("./bigPromise");
const JwtService = require("../utils/jwtService");

const auth = bigPromise(async (req, res, next) => {
  // get header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return ErrorHandler(res, 400, "unAuthorized");
  }

  // get token
  const token = authHeader.split(" ")[1];

  try {
    const { _id, phone_number } = await JwtService.verify(token);

    // set id & phone_number
    req.user = {
      _id: mongoose.Types.ObjectId(_id),
      phone_number,
    };

    next();
  } catch (err) {
    return ErrorHandler(res, 401, "unAuthorized");
  }
});

module.exports = auth;
