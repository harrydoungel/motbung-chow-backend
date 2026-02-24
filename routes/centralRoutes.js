const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Restaurant = require("../models/Restaurant");
const DeliveryPartner = require("../models/DeliveryPartner");

// Get existing compiled User model safely
const User = mongoose.models.User;

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

module.exports = router;