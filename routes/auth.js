const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const admin = require("firebase-admin");
const Restaurant = require("../models/Restaurant");
const auth = require("../middleware/authMiddleware"); // your JWT middleware

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

    // 🔹 Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decoded.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number missing",
      });
    }

    // 🔹 Find or create USER (NOT restaurant)
    let user = await User.findOne({ phone: phoneNumber });

    if (!user) {
      user = await User.create({
        phone: phoneNumber,
        name: "",
        address: ""
      });
    }

    // 🔹 Create JWT using MongoDB user._id
    const sessionToken = jwt.sign(
      {
        id: user._id,
        phone: phoneNumber,
        role: "customer"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token: sessionToken
    });

  } catch (err) {
    console.error("Customer login failed:", err);
    return res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
});

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
        name: "Restaurant " + phoneNumber.slice(-4),
        phone: phoneNumber,
        address: "",
        restaurantCode: "MC" + (count + 1),
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
        restaurantCode: restaurant.restaurantCode, // ✅ USE CODE (NOT _id)
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

const DeliveryPartner = require("../models/DeliveryPartner");

router.post("/driver-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    const decoded = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decoded.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ success: false });
    }

const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const userRoutes = require("./routes/userRoutes");

/* =========================
   UPDATE CUSTOMER ACCOUNT
========================= */
router.put("/update", auth, async (req, res) => {
  try {
    const { name, address } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,  // comes from JWT middleware
      { name, address },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false });
    }

    res.json({
      success: true,
      user: updatedUser
    });

  } catch (err) {
    console.error("User update error:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;

    let driver = await DeliveryPartner.findOne({ phone: phoneNumber });

    if (!driver) {
      driver = await DeliveryPartner.create({
        name: "Delivery " + phoneNumber.slice(-4),
        phone: phoneNumber,
      });
    }

    const token = jwt.sign(
      {
        id: decoded.uid,
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


// SECURE CUSTOMER UPDATE
router.put("/update", auth, async (req, res) => {
  try {
    const { name, address } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, address },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: updatedUser });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
/* ============================================
   HEALTH CHECK
============================================ */
router.get("/health", (req, res) => {
  res.json({ success: true });
});

module.exports = router;
 



