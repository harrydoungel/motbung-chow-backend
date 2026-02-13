const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const admin = require("firebase-admin");
const Restaurant = require("../models/Restaurant");

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
   PHONE LOGIN → CREATE / FIX RESTAURANT → JWT
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

    if (!admin.apps.length) {
      return res.status(500).json({
        success: false,
        message: "Firebase not initialized on server",
      });
    }

    /* ========= VERIFY FIREBASE TOKEN ========= */
    const decoded = await admin.auth().verifyIdToken(idToken);

    const uid = decoded.uid;
    const phoneNumber = decoded.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number missing in Firebase token",
      });
    }

    /* ========= FIND EXISTING RESTAURANT ========= */
    let restaurant = await Restaurant.findOne({ phone: phoneNumber });

    /* ========= CREATE NEW RESTAURANT ========= */
    if (!restaurant) {
      const count = await Restaurant.countDocuments();

      restaurant = await Restaurant.create({
        name: "New Restaurant",
        phone: phoneNumber,
        location: "",
        restaurantCode: "MC" + (count + 1), // MC1, MC2...
      });

      console.log("🏪 Restaurant auto-created:", restaurant.restaurantCode);
    }

    /* ========= FIX OLD RESTAURANTS WITHOUT CODE ========= */
    if (!restaurant.restaurantCode) {
      const count = await Restaurant.countDocuments();

      restaurant.restaurantCode = "MC" + count;
      await restaurant.save();

      console.log("🔧 Added missing restaurantCode:", restaurant.restaurantCode);
    }

    /* ========= CREATE SESSION JWT ========= */
    const sessionToken = jwt.sign(
      {
        id: uid,
        phone: phoneNumber,
        restaurantId: restaurant._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token: sessionToken,
      restaurantId: restaurant._id,
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
   HEALTH CHECK
============================================ */
router.get("/health", (req, res) => {
  res.json({ success: true });
});

module.exports = router;
