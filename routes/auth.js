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

// 🔥 TEST LOGIN FOR RAZORPAY
if (idToken === "test-token-razorpay") {
  const phoneNumber = "+919999999999";

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
      phone: user.phone,
      role: "customer"
    },
    process.env.JWT_SECRET,
    { expiresIn: "90d" }
  );

  return res.json({ success: true, token });
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
        phone: user.phone,
        role: "customer"
      },
      process.env.JWT_SECRET,
      { expiresIn: "90d" }
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

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id },
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

    res.json({ success: true, token, driver});

  } catch (err) {
    console.error("Driver login error:", err);
    res.status(401).json({ success: false });
  }
});

/* ===============================
   DRIVER GET PROFILE
=============================== */
router.get("/driver/:phone", async (req, res) => {
  try {

    const driver = await DeliveryPartner.findOne({
      phone: req.params.phone
    });

    res.json({
      success: true,
      driver
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ===============================
   DRIVER UPDATE PROFILE
=============================== */
router.put("/driver-update", async (req, res) => {
  try {
    const { phone, name, address, vehicle } = req.body;

    const driver = await DeliveryPartner.findOneAndUpdate(
      { phone: phone },
      {
        name,
        address,
        vehicle,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!driver) {
      return res.json({ success: false });
    }

    res.json({
      success: true,
      driver
    });

  } catch (err) {
    console.error("Driver update error:", err);
    res.status(500).json({ success: false });
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

    }catch (err) {
      console.error("🔥 REAL ERROR:", err.code, err.message);

      res.status(401).json({
        success: false,
        message: err.message
      });
    }

});


/* ===============================
   RESTAURANT PROFILE
=============================== */

// GET restaurant profile
router.get("/restaurant/profile", auth, async (req, res) => {
  try {
    if (req.user.role !== "restaurant") {
      return res.status(403).json({ message: "Access denied" });
    }

    const restaurant = await Restaurant.findById(req.user.id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({
      ownerName: restaurant.ownerName || "",
      restaurant: restaurant.name || "",
      phone: restaurant.phone || "",
      location: restaurant.address || "",
      openTime: restaurant.openTime || "",
      closeTime: restaurant.closeTime || ""
    });

  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE restaurant profile
router.put("/restaurant/profile", auth, async (req, res) => {
  try {
    if (req.user.role !== "restaurant") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { ownerName, restaurant, location, openTime, closeTime } = req.body;

    const updated = await Restaurant.findByIdAndUpdate(
      req.user.id,
      {
        ownerName: ownerName,
        name: restaurant,
        address: location,
        openTime: openTime,
        closeTime: closeTime
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({
      message: "Profile updated",
      openTime: updated.openTime,
      closeTime: updated.closeTime
    });

  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===============================
   HEALTH
=============================== */
router.get("/health", (req, res) => {
  res.json({ success: true });
});

module.exports = router;