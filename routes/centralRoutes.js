const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Restaurant = require("../models/Restaurant");
const DeliveryPartner = require("../models/DeliveryPartner");
const Feedback = require("../models/Feedback");

// Get existing compiled User model safely
const User = require("../models/User");

// GET ALL RESTAURANTS
router.get("/restaurants", async (req, res) => {
  const restaurants = await Restaurant.find().sort({ createdAt: -1 });
  res.json(restaurants);
});

// GET ALL CUSTOMERS
router.get("/customers", async (req, res) => {
  const customers = await User.find().sort({ createdAt: -1 });
  res.json(customers);
});

// GET ALL DRIVERS
router.get("/drivers", async (req, res) => {
  const drivers = await DeliveryPartner.find().sort({ createdAt: -1 });
  res.json(drivers);
});

// SAVE FEEDBACK
router.post("/feedback", async (req, res) => {
  try {

    const { message, userPhone, orderId } = req.body;

    const feedback = new Feedback({
      message,
      userPhone,
      orderId
    });

    await feedback.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET FEEDBACK
router.get("/feedback", async (req, res) => {
  const feedback = await Feedback
    .find()
    .sort({ createdAt: -1 });

  res.json(feedback);
});

module.exports = router;