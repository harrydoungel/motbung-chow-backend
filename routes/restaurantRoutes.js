const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Restaurant = require("../models/Restaurant");
const auth = require("../middleware/authMiddleware");

/*
POST /api/restaurants/signup
Creates a new restaurant for logged-in Firebase user
*/
router.post("/signup", auth, async (req, res) => {
  try {
    const ownerUserId = req.user.id; // Firebase UID from token
    const { name, phone, address } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and address are required",
      });
    }

    // Check if restaurant already exists for this owner
    const existing = await Restaurant.findOne({ ownerUserId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Restaurant already registered for this account",
      });
    }

    // Create restaurant
    const restaurant = new Restaurant({
      name,
      phone,
      address,
      ownerUserId,
    });

    await restaurant.save();

    // Create JWT containing restaurantId
    const token = jwt.sign(
      {
        id: ownerUserId,
        role: "restaurant",
        restaurantId: restaurant._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Restaurant created successfully",
      token,
      restaurantId: restaurant._id,
      restaurant,
    });
  } catch (err) {
    console.error("❌ Restaurant signup error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;

/*
POST /api/restaurants/login
Returns restaurant info for logged-in Firebase user
*/
router.post("/login", auth, async (req, res) => {
  try {
    const ownerUserId = req.user.id;

    // Find restaurant owned by this Firebase user
    const restaurant = await Restaurant.findOne({ ownerUserId });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found. Please sign up first.",
      });
    }

    // Create JWT with restaurantId
    const token = jwt.sign(
      {
        id: ownerUserId,
        role: "restaurant",
        restaurantId: restaurant._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      restaurantId: restaurant._id,
      restaurant,
    });
  } catch (err) {
    console.error("❌ Restaurant login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
