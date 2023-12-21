const jwt = require("jsonwebtoken");
const { doubleEncryptData, doubleDecryptData } = require("./doubleEncryption");
class JwtService {
  // set expiry to 30m by default
  static sign(payload, expiry = "30m",secret = process.env.ACCESS_TOKEN_KEY) {
    const token = doubleEncryptData(jwt.sign(payload, secret,{ expiresIn: expiry }));
    return token;
  }

  static verify(token) {
    console.log(jwt.verify(token, secret));
    return doubleDecryptData(jwt.verify(token, secret));
  }
}

module.exports = JwtService;
