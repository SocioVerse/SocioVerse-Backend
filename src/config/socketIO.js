const { Socket } = require('socket.io');
const Message = require('../models/messageModel');
const Room = require('../models/chatRoomModel');
const User = require('../models/usersModel');
const { socketAuth } = require('../middlewares/auth'); // Update the path
const { default: mongoose } = require('mongoose');

const initializeSocketIO = (server) => {
    const io = require('socket.io')(server, {
        cors: {
            origin: '*',
        }
    });

    io.use(async (socket, next) => {
        try {
            console.log(socket.handshake);
            await socketAuth(socket.handshake, {}, next);
            console.log(socket.handshake.user);
        } catch (error) {
            console.log(error);
            next(error);
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected');
        socket.on('join', ({ roomId }) => {
            console.log(roomId, "Joined");
            socket.join(roomId);
        });

        socket.on('leave', ({ roomId }) => {
            socket.leave(roomId);
        });
        socket.on('message-seen', async ({ roomId }) => {
            await Message.updateMany(
                { room_id: roomId, seenBy: { $ne: socket.handshake.user._id } },
                { $addToSet: { seenBy: socket.handshake.user._id } }
            );
            //Participants count of room
            const participantsCount = await Room.findById(roomId, {
                participants: 1,
                _id: 0,
            });
            const messages = await Message.aggregate([
                {
                    $match: {
                        room_id: new mongoose.Types.ObjectId(roomId),
                    },
                },
                {
                    $sort: {
                        createdAt: 1,
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "sentBy",
                        foreignField: "_id",
                        as: "sender",
                    },
                },
                {
                    $unwind: "$sender"
                },
                {
                    $project: {
                        "sender._id": 1,
                        "sender.profile_pic": 1,
                        "sender.username": 1,
                        "sender.name": 1,
                        "sender.occupation": 1,
                        "sender.email": 1,
                        _id: 1,
                        message: 1,
                        image: 1,
                        thread: 1,
                        seenBy: 1,
                        createdAt: 1,
                    },
                },
            ]);
            const updatedMessages = messages.map((message) => {
                message.isSeenByAll = message.seenBy.length == participantsCount.participants.length;
                message.sender.isOwner = message.sender._id.toString() == socket.handshake.user._id.toString();
                return message;
            });
            io.to(roomId).emit('message-seen', updatedMessages);
        });
        socket.on('typing', ({ roomId, isTyping }) => {
            socket.broadcast.to(roomId).emit('typing', { roomId, user: socket.handshake.user, isTyping });
        });
        socket.on('unsend-message', async ({ roomId, messageId }) => {
            const message = await Message.findById(messageId);





            if (message.sentBy.toString() == socket.handshake.user._id.toString()) {
                await Message.findByIdAndDelete(messageId);
                const lastMessage = await Message.findOne({ room_id: roomId }).sort({ createdAt: -1 }).limit(1);
                await Room.findByIdAndUpdate(roomId, { lastMessage: lastMessage?._id });
                io.to(roomId).emit('unsend-message', { roomId, messageId });
            }
        });
        socket.on('message', async ({ roomId, message, image, thread }) => {
            console.log(roomId, message, image, thread);
            const newMessage = new Message({
                message,
                sentBy: socket.handshake.user._id,
                image,
                thread,
                room_id: roomId,
            });

            const savedMessage = await newMessage.save();

            const room = await Room.findById(roomId);

            room.lastMessage = savedMessage._id;

            await room.save();

            newMessage._doc.sender = await User.findById(socket.handshake.user._id, {
                _id: 1,
                profile_pic: 1,
                username: 1,
                name: 1,
                occupation: 1,
                email: 1,
            });

            newMessage._doc.isSeenByAll = newMessage._doc.seenBy.length == room._doc.participants.length;
            io.to(roomId).emit('message', newMessage);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });
};

module.exports = initializeSocketIO;
