const express = require("express");
require("dotenv").config();
const app = express();
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
var cors = require('cors');
var fileupload = require("express-fileupload");

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: false }));
app.use(express.json());
app.use(fileupload());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("tiny"));

const refresh = require("./controllers/refreshController");
const users = require("./controllers/usersController");

app.use("/api/users", users);
app.use("/api/token", refresh)


module.exports = app;

