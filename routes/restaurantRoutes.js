const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const Restaurant = require("../models/Restaurant");
const auth = require("../middleware/authMiddleware");

/*
GET /api/restaurants
Returns list of all restaurants (for customers)
*/
router.get("/", async (req, res) => {
  try {
    const restaurants = await Restaurant.find().select(
      "_id name restaurantCode location"
    );

    res.json({
      success: true,
      restaurants,
    });
  } catch (err) {
    console.error("❌ Fetch restaurants error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/*
POST /api/restaurants/signup
Creates a new restaurant for logged-in Firebase user
*/
router.post("/signup", auth, async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const { name, phone, address } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and address are required",
      });
    }

    const existing = await Restaurant.findOne({ ownerUserId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Restaurant already registered for this account",
      });
    }

    const restaurant = new Restaurant({
      name,
      phone,
      address,
      ownerUserId,
    });

    await restaurant.save();

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

/*
POST /api/restaurants/login
Returns restaurant info for logged-in Firebase user
*/
router.post("/login", auth, async (req, res) => {
  try {
    const ownerUserId = req.user.id;

    const restaurant = await Restaurant.findOne({ ownerUserId });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found. Please sign up first.",
      });
    }

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

router.put("/update", async (req, res) => {
  try {
    const { restaurantId, name, address } = req.body;

    const updated = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { name, address },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, restaurant: updated });

  } catch (err) {
    console.error("Restaurant update error:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
