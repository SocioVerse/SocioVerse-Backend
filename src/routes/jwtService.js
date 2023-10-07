const jwt = require('jsonwebtoken')

class JwtService {
    // set expiry to 30m by default
    static sign(payload, expiry = '30m', secret = process.env.ACCESS_TOKEN_KEY) {
        
        const token = jwt.sign(payload, secret, { expiresIn: expiry });
        return token;
    }

    static verify(token, secret = process.env.ACCESS_TOKEN_KEY) {
        return jwt.verify(token, secret)
    }
}

module.exports = JwtService