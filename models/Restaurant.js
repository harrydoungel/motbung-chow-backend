const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    address: {
      type: String,
      default: "",
    },

    restaurantCode: {
      type: String,
      unique: true,
    },

    // 🔥 IMPORTANT FOR SPLIT
    razorpayAccountId: {
      type: String,
      default: "",
    },

    isKycCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);