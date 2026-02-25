const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/*
  🔥 Prevent OverwriteModelError
  If model already exists (Render hot reload / recompile),
  reuse it instead of redefining.
*/
module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema);