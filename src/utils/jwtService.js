const jwt = require("jsonwebtoken");
const { doubleEncryptData, doubleDecryptData } = require("./doubleEncryption");
class JwtService {
  // set expiry to 30m by default
  static sign(payload, expiry = "365d", secret = process.env.ACCESS_TOKEN_KEY) {
    const token = doubleEncryptData(jwt.sign(payload, secret, { expiresIn: expiry }));
    return token;
  }

  static verify(token, secret = process.env.ACCESS_TOKEN_KEY) {
    return jwt.verify(doubleDecryptData(token), secret);
  }
}

module.exports = JwtService;
