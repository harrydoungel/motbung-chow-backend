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

    // This will store Razorpay Order ID
    orderId: {
      type: String,
      required: true,
    },

    /* =========================
       PAYMENT BREAKDOWN
    ========================== */

    itemsTotal: {
      type: Number,
      required: true,
    },

    platformFee: {
      type: Number,
      default: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
    },

    tip: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    /* =========================
       DELIVERY INFO
    ========================== */

    location: {
      type: String,
      required: true,
    },

    mapLink: {
      type: String,
      default: "",
    },

    /* =========================
       RELATIONS
    ========================== */

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      default: null,
    },

    /* =========================
       RAZORPAY INFO
    ========================== */

    razorpayOrderId: {
      type: String,
      required: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    splitTransferred: {
      type: Boolean,
      default: false,
    },

    /* =========================
       ORDER STATUS
    ========================== */

    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "FAILED"],
      default: "PENDING",
    },

    /* =========================
       ITEMS
    ========================== */

    items: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        restaurantCode: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);