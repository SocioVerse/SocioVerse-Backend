const { ErrorHandler } = require("../helpers/customResponse");
const bigPromise = require("./bigPromise");
const JwtService = require("../utils/jwtService");
const User = require("../models/usersModel");
module.exports.socketPopulate = bigPromise(async (req, next) => {
    // get header
    const userId = req.query.userId;
    console.log(userId);

    if (!userId) {
        return Error('Authentication error');
    }


    try {
        const { _id, phone_number, email } = await User.findById(
            userId,
        );
        // set id , phone_number and email
        req.user = {
            _id,
            phone_number,
            email
        };
        console.log(req.user);

        next();
    } catch (err) {
        console.log(err);
        return Error('Authentication error');
    }
});
