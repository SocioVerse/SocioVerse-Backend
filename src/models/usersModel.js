const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    phone_number: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    occupation: {
        type: String,
        required: true,
        trim: true
    },
    profile_pic: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    dob: {
        type: Date,
        required: true,
    },
    gender: {
        type: String,
        trim: true

    },
    website: {
        type: String,
        trim: true

    },
    face_image_dataset: [
        {
            type: String,
            trim: true,

            default: [],
        }
    ],







}, {
    timestamps: true
});

module.exports = mongoose.model('users', userSchema);