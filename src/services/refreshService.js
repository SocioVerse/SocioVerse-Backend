const { ControllerResponse, ErrorHandler } = require("../helpers/customResponse");
const BigPromise = require("../middlewares/bigPromise");
const RefreshToken = require("../models/refreshToken")
const jwt = require("../utils/jwtService")

exports.refresh = BigPromise(async (req, res) => {
    try {
        if (!req.body.refresh_token) {
            return ErrorHandler(res, 400, "Token is required")
        }

        // check if token is in db.
        console.log(req.body.refresh_token, "req.body.refresh_token")
        const refreshToken = await RefreshToken.findOne({ token: req.body.refresh_token })
        console.log(refreshToken, "refreshToken")
        if (!refreshToken) {
            return ErrorHandler(res, 400, "Invalid refresh token")
        }

        // get _id & phone_number
        const { _id, phone_number, email } = jwt.verify(refreshToken.token, process.env.REFRESH_TOKEN_KEY)

        console.log(_id, phone_number, email, "refreshTokenDecode")
        // generate access token
        const access_token = jwt.sign({
            _id,
            phone_number,
            email
        });
        const refresh_token = jwt.sign(
            {
                _id,
                phone_number,
                email
            },
            "30d",
            process.env.REFRESH_TOKEN_KEY
        );

        console.log(access_token, refresh_token, "access_token, refresh_token")

        // store refresh token in database.
        await RefreshToken.create({ token: refresh_token });
        // remove old refresh token from databasef
        await RefreshToken.findOneAndDelete({ token: req.body.refresh_token })


        return ControllerResponse(res, 200, { access_token, refresh_token })
    }
    catch (error) {
        return ErrorHandler(res, 500, error.message || "Internal Server Error")
    }
})