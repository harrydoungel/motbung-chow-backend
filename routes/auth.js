const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const admin = require("firebase-admin");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const DeliveryPartner = require("../models/DeliveryPartner");
const auth = require("../middleware/authMiddleware");

/* ===============================
   FIREBASE INIT
=============================== */
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin Initialized");
}

/* ===============================
   CUSTOMER LOGIN
=============================== */
router.post("/phone-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decoded.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ success: false });
    }

    let user = await User.findOne({ phone: phoneNumber });

    if (!user) {
      user = await User.create({
        phone: phoneNumber,
        name: "",
        address: ""
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: "customer"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token });

  } catch (err) {
    console.error("Customer login error:", err);
    res.status(401).json({ success: false });
  }
});

/* ===============================
   CUSTOMER UPDATE
=============================== */
router.put("/update", auth, async (req, res) => {
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
    console.error("Update error:", err);
    res.status(500).json({ success: false });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, user });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ===============================
   DRIVER LOGIN
=============================== */
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
        phone: phoneNumber,
        name: ""
      });
    }

    const token = jwt.sign(
      {
        id: driver._id,
        role: "driver"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token });

  } catch (err) {
    console.error("Driver login error:", err);
    res.status(401).json({ success: false });
  }
});
/* ===============================
     RESTAURENT LOGIN
=============================== */
router.post("/restaurant-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: "No token provided" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decoded.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number not found" });
    }

    // 🔥 LOGIN OR REGISTER LOGIC
    let restaurant = await Restaurant.findOne({ phone: phoneNumber });

    if (!restaurant) {
      restaurant = await Restaurant.create({
        phone: phoneNumber,
        name: "",
        isActive: true
      });

      console.log("New restaurant created:", restaurant._id);
    }

    const token = jwt.sign(
      {
        id: restaurant._id,
        role: "restaurant",
        restaurantId: restaurant._id
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      restaurantId: restaurant._id,
      restaurant
    });

  } catch (err) {
    console.error("Restaurant login error:", err);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

/* ===============================
   HEALTH
=============================== */
router.get("/health", (req, res) => {
  res.json({ success: true });
});

module.exports = router;