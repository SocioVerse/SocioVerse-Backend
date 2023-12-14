const app = require("./app");
const connectWithDb = require("./config/mongoDB");
require("dotenv").config();


connectWithDb();

app.listen(process.env.PORT,"0.0.0.0", () => {
    console.log(`Server is running on port: ${process.env.PORT}`);
});