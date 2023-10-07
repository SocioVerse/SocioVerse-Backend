const bcrypt = require('bcrypt');
const saltRounds = 10; // Number of salt rounds for bcrypt (adjust as needed)


// Function to hash a password
const hashPassword = async (password) => {
    return await bcrypt.hash(password, saltRounds);
};

// Function to verify a password
const verifyPassword = async  (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
    hashPassword,
    verifyPassword,
};
