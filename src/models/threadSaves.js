const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const savedThreadsSchema = new Schema(
  {
    thread_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "threads",
      required: true,
    },
    saved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ThreadSaves", savedThreadsSchema);
