const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Interview schema mongoose
const interviewSchema = new Schema(
  {
    dateAndTime: {
      type: Date,
      required: true,
    },
    peerFirst: { type: Schema.Types.ObjectId, ref: "User" },
    peerSecond: { type: Schema.Types.ObjectId, ref: "User" },
    available: {
      type: Boolean,
      required: false,
      default: true,
    },
    channelName: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Interview = mongoose.model("Interview", interviewSchema);
module.exports = Interview;
