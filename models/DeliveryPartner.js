const mongoose = require("mongoose");

const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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

    vehicle: {
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

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);