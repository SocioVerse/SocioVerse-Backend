const app = require("./app");
const connectWithDb = require("./config/mongoDB");
const initializeSocketIO = require("./config/socketIO");
const initializeFirebase = require("./config/fireBaseAdmin");
const cron = require('node-cron');
const deleteOldStories = require("./services/storyServices").deleteOldStories;




// Import the dotenv package
require('dotenv').config();
// Initialize the socket.io server
const server = require('http').createServer(app);
initializeSocketIO(server);
// Initialize the firebase admin
initializeFirebase();
connectWithDb();

// Schedule the cron job to run every 24 hours
// cron.schedule('* * * * * *', () => {
//     deleteOldStories();
// });


server.listen(process.env.PORT, () => {
    console.log(`Server is running on port: ${process.env.PORT}`);
});