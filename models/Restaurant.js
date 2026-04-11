const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: {            
      type: String,
      default: "",
    },

    restaurant: {       
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

    timeRange: {
      type: String,
      default: ""
    },

    openDays: {
      type: String,
      default: ""
    },

    lat: {
      type: Number,
      default: null
    },

    lng: {
      type: Number,
      default: null
    },

    fcmToken: {
      type: String,
      default: ""
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