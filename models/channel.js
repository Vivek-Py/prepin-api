const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// User schema mongoose
const channelSchema = new Schema(
  {
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

const Channel = mongoose.model("Channel", channelSchema);
module.exports = Channel;
