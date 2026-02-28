const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: {            // restaurant name
      type: String,
      default: "",
    },

    ownerName: {       // 🔥 NEW FIELD
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