const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const followSchema = new Schema(
  {
    //user1 will always send request to user2
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    isaccepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("follow", followSchema);
