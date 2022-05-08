const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const documentSchema = new Schema({
  _id: String,
  data: Object,
});

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
