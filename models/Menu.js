const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    name: { type: String, required: true },

    price: { type: Number, required: true },

    category: { type: String, default: "other" },

    image: { type: String, default: "" },

    // ⭐ availability toggle for admin hide/show
    available: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Menu", menuSchema);
