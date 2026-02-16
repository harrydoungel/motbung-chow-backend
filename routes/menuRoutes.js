const Restaurant = require("../models/Restaurant");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const Menu = require("../models/Menu");
const auth = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================
   ENSURE UPLOADS FOLDER EXISTS
========================= */
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   MULTER STORAGE CONFIG
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/* =========================
   GET MENU BY RESTAURANT
========================= */
router.get("/code/:restaurantCode", async (req, res) => {
  try {
    const { restaurantCode } = req.params;

    // 1️⃣ Find restaurant by code (MC1)
    const restaurant = await Restaurant.findOne({
      restaurantCode: restaurantCode,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // 2️⃣ Fetch menu using real ObjectId
    const items = await Menu.find({
      restaurantId: restaurant._id,
      available: true, // only show available items to customer
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      restaurantId: restaurant._id,
      items,
    });
  } catch (err) {
    console.error("❌ Menu fetch by code error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* =========================
   ADD MENU ITEM (ADMIN)
========================= */
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { name, price, category } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: "Name and price are required",
      });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    const item = await Menu.create({
      restaurantId: req.user.restaurantId,
      name,
      price,
      category,
      image: imagePath,
      available: true,
    });

    res.json({ success: true, item });
  } catch (err) {
    console.error("❌ Menu create error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================
   TOGGLE AVAILABILITY (HIDE / AVAILABLE)
========================= */
router.patch("/:id/toggle", async (req, res) => {
  try {
    console.log("TOGGLE ROUTE HIT");
    console.log("ID RECEIVED:", req.params.id);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu ID",
      });
    }

    const item = await Menu.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    item.available = !item.available;
    await item.save();

    console.log("TOGGLE SUCCESS");

    res.json({
      success: true,
      available: item.available,
    });

  } catch (err) {
    console.error("FULL TOGGLE ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
