const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// User schema mongoose
const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      default: "",
    },
    lastName: {
      type: String,
      required: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: false,
      default: "",
    },
    image: {
      type: String,
      required: false,
      default: "",
    },
    sessionsAttended: {
      type: Number,
      required: false,
      default: 0,
    },
    tags: {
      type: [String],
      required: false,
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
