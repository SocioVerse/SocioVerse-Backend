const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const locationSchema = new Schema(
    {

        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        state: {
            type: String,
        },
        country: {
            type: String,
        },
        latitude: {
            type: String,
            required: true,
        },
        longitude: {
            type: String,
            required: true,
        },


        post_count: {
            type: Number,
            default: 0,
        },

    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("locations", locationSchema);