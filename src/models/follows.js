const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const followsSchema = new Schema(
  {
    followed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    followed_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    is_confirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("follows", followsSchema);
