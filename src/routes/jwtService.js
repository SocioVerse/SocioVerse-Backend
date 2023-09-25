const jwt = require('jsonwebtoken')
const { encryptData, decryptData } = require('./encryption')

class JwtService {
    // set expiry to 30m by default
    static sign(payload, expiry = '30m', secret = process.env.ACCESS_TOKEN_KEY) {
        
        const token = jwt.sign(payload, secret, { expiresIn: expiry });
        return encryptData(token)
    }

    static verify(token, secret = process.env.ACCESS_TOKEN_KEY) {
        return jwt.verify(decryptData(token), secret)
    }
}

module.exports = JwtService