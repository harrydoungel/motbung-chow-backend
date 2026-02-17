const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Menu = require("../models/Menu");
const Restaurant = require("../models/Restaurant");
const auth = require("../middleware/authMiddleware");

/* =========================
   CLOUDINARY + MULTER SETUP
========================= */
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "motbung-menu",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
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
      available: true,
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
   3️⃣ ADMIN: ADD MENU ITEM (CLOUDINARY UPLOAD)
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

    let imageUrl = "";

    // CloudinaryStorage already uploads the image
    if (req.file) {
      imageUrl = req.file.path; // ✅ this is already the Cloudinary URL
    }

    const item = await Menu.create({
      restaurantId: req.user.restaurantId,
      name,
      price,
      category,
      image: imageUrl,
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

/* =====================================================
   5️⃣ ADMIN: DELETE MENU ITEM
===================================================== */
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
