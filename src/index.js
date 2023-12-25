const app = require("./app");
const connectWithDb = require("./config/mongoDB");

const initializeFirebase = require("./config/fireBaseAdmin");
// Import the dotenv package
require('dotenv').config();

initializeFirebase();

connectWithDb();

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port: ${process.env.PORT}`);
});