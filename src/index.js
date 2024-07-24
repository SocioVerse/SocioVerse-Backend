const app = require("./app");
const connectWithDb = require("./config/mongoDB");
const initializeSocketIO = require("./config/socketIO");
const initializeFirebase = require("./config/fireBaseAdmin");
// Import the dotenv package
require('dotenv').config();
// Initialize the socket.io server
const server = require('http').createServer(app);
initializeSocketIO(server);
// Initialize the firebase admin
initializeFirebase();
connectWithDb();

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port: ${process.env.PORT}`);
});