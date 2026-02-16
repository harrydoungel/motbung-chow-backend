const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Menu = require("../models/Menu");
const Restaurant = require("../models/Restaurant");
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

/* =====================================================
   1️⃣ CUSTOMER: GET MENU BY RESTAURANT CODE (MC1)
===================================================== */
router.get("/code/:restaurantCode", async (req, res) => {
  try {
    const { restaurantCode } = req.params;

    const restaurant = await Restaurant.findOne({
      restaurantCode: restaurantCode,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const items = await Menu.find({
      restaurantId: restaurant._id,
      available: true, // only visible items for customers
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      restaurantId: restaurant._id,
      items,
    });

  } catch (err) {
    console.error("❌ Customer menu fetch error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* =====================================================
   2️⃣ ADMIN: GET MENU BY RESTAURANT ID
===================================================== */
router.get("/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const items = await Menu.find({
      restaurantId: restaurantId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      items,
    });

  } catch (err) {
    console.error("❌ Admin menu fetch error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* =====================================================
   3️⃣ ADMIN: ADD MENU ITEM
===================================================== */
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

    res.json({
      success: true,
      item,
    });

  } catch (err) {
    console.error("❌ Menu create error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* =====================================================
   4️⃣ ADMIN: TOGGLE AVAILABILITY
===================================================== */
router.patch("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu ID",
      });
    }

    const item = await Menu.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    item.available = !item.available;
    await item.save();

    res.json({
      success: true,
      available: item.available,
    });

  } catch (err) {
    console.error("❌ Toggle availability error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Menu.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


module.exports = router;
