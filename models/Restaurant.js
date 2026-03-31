const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: {            
      type: String,
      default: "",
    },

    ownerName: {       
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

    openTime: {
      type: String,
      default: ""
    },

    closeTime: {
      type: String,
      default: ""
    },

    // ✅ ADD THESE TWO LINES
    lat: {
      type: Number,
      default: null,
    },

    lng: {
      type: Number,
      default: null,
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