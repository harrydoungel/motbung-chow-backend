const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const admin = require("firebase-admin");
const Restaurant = require("../models/Restaurant");

/* ============================================
   FIREBASE ADMIN INIT
============================================ */
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin Initialized");
}

/* ============================================
   PHONE LOGIN → CREATE RESTAURANT → ISSUE JWT
   POST /api/auth/phone-login
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

    /* ========= FIND OR CREATE RESTAURANT ========= */
    let restaurant = await Restaurant.findOne({ phone: phoneNumber });

    if (!restaurant) {
      restaurant = await Restaurant.create({
        name: "New Restaurant",
        phone: phoneNumber,
        location: "",
      });

      console.log("🏪 Restaurant auto-created:", restaurant._id);
    }

    /* ========= CREATE SESSION JWT ========= */
    const sessionToken = jwt.sign(
      {
        id: uid,
        phone: phoneNumber,
        restaurantId: restaurant._id, // ⭐ CRITICAL
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token: sessionToken,
      restaurantId: restaurant._id,
    });
  } catch (err) {
    console.error("❌ LOGIN FAILED:", err.message);

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
