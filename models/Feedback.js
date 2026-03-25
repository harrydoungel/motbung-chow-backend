const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  message: String,
  userPhone: String,
  orderId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Feedback", feedbackSchema);