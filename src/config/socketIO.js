const { Socket } = require('socket.io');
const Message = require('../models/messageModel');
const Room = require('../models/chatRoomModel');
const User = require('../models/usersModel');
const { socketAuth } = require('../middlewares/auth'); // Update the path
const { default: mongoose } = require('mongoose');
const messageListner = require("../listeners/messageListener");

const initializeSocketIO = (httpServer) => {
    const io = require("socket.io")(httpServer, {
        cors: {
            origin: '*',
        }
    });
    const ioUse = async (socket, next) => {
        try {
            console.log(socket.handshake);
            await socketAuth(socket.handshake, {}, next);
            console.log(socket.handshake.user);
        } catch (error) {
            console.log(error);
            next(error);
        }
    }
    const onConnection = (socket) => {
        console.log("New Connection");
        messageListner(io, socket);
    }

    io.use(ioUse);
    io.on("connection", onConnection);
};

module.exports = initializeSocketIO;
