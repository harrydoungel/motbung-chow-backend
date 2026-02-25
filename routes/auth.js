const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const admin = require("firebase-admin");
const Restaurant = require("../models/Restaurant");
const DeliveryPartner = require("../models/DeliveryPartner");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

/* ============================================
   SAFE FIREBASE ADMIN INIT
============================================ */
try {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT env missing");
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin Initialized");
  }
} catch (err) {
  console.error("❌ Firebase Admin init failed:", err.message);
}

/* ============================================
   PHONE LOGIN → CREATE USER + RESTAURANT → JWT
============================================ */
router.post("/phone-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "idToken is required",
      });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decoded.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number missing in Firebase token",
      });
    }

    /* ========= CREATE OR FIND USER ========= */
    let user = await User.findOne({ phone: phoneNumber });

    if (!user) {
      user = await User.create({
        name: "",
        phone: phoneNumber,
        address: "",
      });
    }

    /* ========= CREATE OR FIND RESTAURANT ========= */
    let restaurant = await Restaurant.findOne({ phone: phoneNumber });

    if (!restaurant) {
      const count = await Restaurant.countDocuments();

      restaurant = await Restaurant.create({
        name: "Restaurant " + phoneNumber.slice(-4),
        phone: phoneNumber,
        address: "",
        restaurantCode: "MC" + (count + 1),
      });

      console.log("🏪 Restaurant auto-created:", restaurant.restaurantCode);
    }

    if (!restaurant.restaurantCode) {
      const count = await Restaurant.countDocuments();
      restaurant.restaurantCode = "MC" + count;
      await restaurant.save();
    }

    /* ========= SIGN JWT WITH MONGODB USER ID ========= */
    const sessionToken = jwt.sign(
      {
        id: user._id,  // ✅ FIXED (was Firebase uid before)
        phone: phoneNumber,
        restaurantId: restaurant._id,
        restaurantCode: restaurant.restaurantCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token: sessionToken,
      restaurantCode: restaurant.restaurantCode,
    });

  } catch (err) {
    console.error("❌ LOGIN FAILED:", err);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
});

/* ============================================
   GET CURRENT USER (CUSTOMER)
============================================ */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false });

    res.json({ success: true, user });
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================
   UPDATE CUSTOMER ACCOUNT
============================================ */
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { name, address } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, address },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, user: updatedUser });

  } catch (err) {
    console.error("User update error:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================
   DRIVER LOGIN
============================================ */
router.post("/driver-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    const decoded = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decoded.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ success: false });
    }

    let driver = await DeliveryPartner.findOne({ phone: phoneNumber });

    if (!driver) {
      driver = await DeliveryPartner.create({
        name: "Delivery " + phoneNumber.slice(-4),
        phone: phoneNumber,
      });
    }

    const token = jwt.sign(
      {
        id: driver._id,
        role: "driver",
        driverId: driver._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, driver });

  } catch (err) {
    console.error("Driver login error:", err);
    res.status(401).json({ success: false });
  }
});

/* ============================================
   DRIVER UPDATE
============================================ */
router.put("/driver-update", async (req, res) => {
  try {
    const { phone, name, address, vehicle } = req.body;

    const driver = await DeliveryPartner.findOneAndUpdate(
      { phone },
      { name, address, vehicle },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, driver });

  } catch (err) {
    console.error("Driver update error:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================
   HEALTH CHECK
============================================ */
router.get("/health", (req, res) => {
  res.json({ success: true });
});

module.exports = router;