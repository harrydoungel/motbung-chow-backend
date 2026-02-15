const express = require("express");
const router = express.Router();

const Menu = require("../models/Menu");
const auth = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");

/* =========================
   MULTER STORAGE CONFIG
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
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
router.get("/:restaurantId", async (req, res) => {
  try {
    const items = await Menu.find({
      restaurantId: req.params.restaurantId,
    });

    res.json({
      success: true,
      items,
    });
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ success: false });
  }
});

/* =========================
   ADD MENU ITEM (ADMIN)
========================= */
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { name, price, category } = req.body;

    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    const item = await Menu.create({
      restaurantId: req.user.restaurantId,
      name,
      price,
      category,
      image: imagePath,
    });

    res.json({ success: true, item });
  } catch (err) {
    console.error("Menu create error:", err);
    res.status(500).json({ success: false });
  }
});

/* =========================
   TOGGLE AVAILABILITY
========================= */
router.patch("/:id/toggle", auth, async (req, res) => {
  try {
    const item = await Menu.findById(req.params.id);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    // flip available true/false
    item.available = !item.available;
    await item.save();

    res.json({ success: true, available: item.available });
  } catch (err) {
    console.error("Toggle error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

