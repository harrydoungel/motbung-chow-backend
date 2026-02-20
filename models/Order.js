const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      default: "Customer",
    },

    user: {
      type: String,
      required: true,
      index: true,
    },

    orderId: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    mapLink: {
      type: String,
      default: "",
    },

    restaurantCode: {
      type: String,
      required: true,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["ONLINE", "COD"],
      required: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    items: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        restaurantCode: String,
      },
    ],

    status: {
      type: String,
      enum: ["PENDING", "PAID", "COD_PENDING", "DELIVERED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);