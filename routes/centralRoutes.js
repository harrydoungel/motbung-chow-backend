const express = require("express");
const router = express.Router();

const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const DeliveryPartner = require("../models/DeliveryPartner");

// GET ALL RESTAURANTS
router.get("/restaurants", async (req, res) => {
  const restaurants = await Restaurant.find().sort({ createdAt: -1 });
  res.json(restaurants);
});

// GET ALL CUSTOMERS
router.get("/customers", async (req, res) => {
  const customers = await User.find({ role: "customer" }).sort({ createdAt: -1 });
  res.json(customers);
});

// GET ALL DRIVERS
router.get("/drivers", async (req, res) => {
  const drivers = await DeliveryPartner.find().sort({ createdAt: -1 });
  res.json(drivers);
});

module.exports = router;