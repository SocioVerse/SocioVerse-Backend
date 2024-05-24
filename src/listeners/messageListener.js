const { Socket } = require('socket.io');
const Message = require('../models/messageModel');
const Room = require('../models/chatRoomModel');
const User = require('../models/usersModel');
const { socketAuth } = require('../middlewares/auth'); // Update the path
const { default: mongoose } = require('mongoose');
const Follow = require('../models/follows');
const Users = require('../models/usersModel')
module.exports = (io, socket) => {
    const getInbox = async (roomId) => {

        console.log("Seen");
        const room = await Room.findById(roomId);

        const lastMessage = room != null ? await Message.findById(room.lastMessage) : null;
        const unSeenMessages = await Message.countDocuments({
            room_id: roomId, seenBy:


                { $eq: [socket.handshake.user._id] }
        });
        // console.log(socket.handshake.user._id?.toString(), lastMessage.sentBy.toString());
        io.to(roomId).emit('inbox', { roomId, lastMessage, unSeenMessages });
    }

    const sendHomePage = async ({ sentTo }) => {
        // console.log("Sent to", sentTo);
        try {
            if (sentTo == null) return;
            // count of last message unread rooms and send to user

            const inbox = await Room.find({
                participants: { $in: [sentTo] },
                lastMessage: { $ne: null },
            });
            let cnt = 0;
            //filter out the rooms that have unread last messages
            for (let i = 0; i < inbox.length; i++) {
                const room = inbox[i];
                const lastMessage = await Message.findById(room.lastMessage);
                if (lastMessage == null) continue;
                cnt += lastMessage.seenBy.filter((s) => s.toString() != sentTo.toString()).length;
            }
            console.log("Sent to", sentTo.toString());
            console.log("Inbox", inbox);
            console.log("Count", cnt);
            io.to(sentTo.toString()).emit('feed-page-count', { cnt });
        } catch (e) {
            console.error(e);

        }
    }
    const sendTo = async (roomId) => {
        try {
            const room = await Room.findById(roomId);
            if (room == null) return null;
            const lastMessage = room['lastMessage'];
            if (lastMessage == null) {
                sendHomePage({
                    sentTo: room.participants[0]
                });
                sendHomePage({
                    sentTo: room.participants[1]
                });
                return null;
            }
            const sentTo = room.participants.filter((p) => p.toString() != socket.handshake.user._id.toString());
            return sentTo[0];
        } catch (e) {
            console.error(e);
        }
    }

    const joinChat = ({ roomId }) => {
        console.log(roomId, "Joined");
        socket.join(roomId);
    }
    const leaveChat = ({ roomId }) => {
        socket.leave(roomId);
    }
    const messageSeen = async ({ roomId }) => {
        let cntMsg = await Message.countDocuments({ room_id: roomId, soft_delete: false });
        console.log("Seen", cntMsg);
        if (cntMsg == 0) return;

        await Message.updateMany(
            { room_id: roomId, seenBy: { $ne: socket.handshake.user._id }, soft_delete: false },
            { $addToSet: { seenBy: socket.handshake.user._id } }
        );
        const participantsCount = await Room.findById(roomId, {
            participants: 1,
            _id: 0,
        });
        const messages = await Message.aggregate([
            {
                $match: {
                    room_id: new mongoose.Types.ObjectId(roomId),
                    soft_delete: false
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
                    feed: 1,
                    story: 1,
                    profile: 1,

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
        getInbox(roomId);
        sendHomePage({ sentTo: await sendTo(roomId) });
        io.to(roomId).emit('message-seen', updatedMessages);
    }
    const typing = ({ roomId, isTyping }) => {
        console.log(roomId, isTyping);
        socket.broadcast.to(roomId).emit('typing', { roomId, user: socket.handshake.user, isTyping });
    }
    const unsendMessage = async ({ roomId, messageId }) => {
        const message = await Message.findById(messageId);

        if (message.sentBy.toString() == socket.handshake.user._id.toString()) {
            await Message.findByIdAndUpdate(messageId, {
                soft_delete: true
            });
            const lastMessage = await Message.findOne({
                room_id: roomId,
                soft_delete: false
            }).sort({ createdAt: -1 }).limit(1);
            if (lastMessage == null) {
                const deleteRoom = await Room.findById(roomId);
                sendHomePage({ sentTo: deleteRoom.participants[0] });
                sendHomePage({ sentTo: deleteRoom.participants[1] });
                deleteRoom.deleteOne();
                await Message.deleteMany({ room_id: roomId });
            }
            else
                await Room.findByIdAndUpdate(roomId, { lastMessage: lastMessage?._id });
            console.log(roomId, messageId, lastMessage);
            io.to(roomId).emit('unsend-message', { roomId, messageId });
        }
        getInbox(roomId);
        sendHomePage({ sentTo: await sendTo(roomId) });
    }
    const createMessage = async ({ roomId, message, image, thread, feed, story, profile }) => {
        console.log(roomId, message, image, thread);
        const newMessage = new Message({
            message,
            sentBy: socket.handshake.user._id,
            seenBy: [socket.handshake.user._id],
            image,
            thread,
            feed,
            story,
            profile,
            room_id: roomId,
        });

        const savedMessage = await newMessage.save();

        const room = await Room.findByIdAndUpdate(roomId,
            { lastMessage: savedMessage._id },
            { new: true });
        console.log(room);


        newMessage._doc.sender = await User.findById(socket.handshake.user._id, {
            _id: 1,
            profile_pic: 1,
            username: 1,
            name: 1,
            occupation: 1,
            email: 1,
        });

        newMessage._doc.isSeenByAll = newMessage._doc.seenBy.length == room._doc.participants.length;
        console.log(newMessage, "dd");
        io.to(roomId).emit('message', newMessage);
        getInbox(roomId);
        sendHomePage({ sentTo: await sendTo(roomId) });
    }

    const inboxAdd = async ({ roomId, userId }) => {
        console.log('inbox-add', { roomId, userId });

        try {
            const room = await Room.findById(
                roomId,
            );
            const user = userId;


            room._doc.isRequestMessage = await Follow.findOne({
                followed_by: user,
                followed_to: socket.handshake.user._id,
                is_confirmed: true,
            }) == null && await Message.find({
                room_id: room.id,
                sentBy: user
            }).countDocuments() == 0
                ? true : false;
            console.log(user);
            room._doc.user = room.isGroup == false ? await Users.findById(user, {
                _id: 1,
                profile_pic: 1,
                username: 1,
                name: 1,
                occupation: 1,
                email: 1,
            }) : null;
            delete room._doc.participants;
            const lastMessage = await Message.findOne({
                _id: room.lastMessage,
            }, {
                _id: 1,
                message: 1,
                image: 1,
                thread: 1,
                createdAt: 1,
                sentBy: 1,
                updatedAt: 1,
            });

            room.lastMessage = lastMessage;

            const unreadMessages = await Message.countDocuments({
                room_id: room._id,
                soft_delete: false,
                seenBy: { $ne: socket.handshake.user._id },
            });

            room._doc.unreadMessages = unreadMessages;

            console.log("here", userId, room)
            const u = await io.in(userId).fetchSockets()
            console.log(u);
            io.to(userId).emit('inbox-add', room);
        } catch (e) {
            console.error(e)
        }
    }




    const onDisconnect = () => {
        console.log("Disconnected");
    }
    socket.on('join-chat', joinChat);
    socket.on('leave-chat', leaveChat);
    socket.on('message-seen', messageSeen);
    socket.on('inbox-add', inboxAdd);
    socket.on('typing', typing);
    socket.on('send-home-page', sendHomePage);
    socket.on('unsend-message', unsendMessage);
    socket.on('message', createMessage);
    socket.on('disconnect', onDisconnect);
}