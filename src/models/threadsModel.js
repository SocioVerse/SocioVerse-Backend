const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const threadsSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userSchema",
      required: true,
    },
    parent_thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "threadsSchema",
      required: true,
      default: function () {
        return this._id;
      },
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
        default: [],
      },
    ],
    like_count: {
      type: Number,
      default: 0,
    },
    comment_count: {
      type: Number,
      default: 0,
    },
    is_private: {
      type: Boolean,
      default: false,
    },
    isBase: {
      type: Boolean,
      default: true,
    },
    saved_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("threads", threadsSchema);
