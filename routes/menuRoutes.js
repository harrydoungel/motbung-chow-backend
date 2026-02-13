const express = require("express");
const router = express.Router();

const Menu = require("../models/Menu");
const auth = require("../middleware/authMiddleware");

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
router.post("/", auth, async (req, res) => {
  try {
    const { name, price, category, image } = req.body;

    const item = await Menu.create({
      restaurantId: req.user.restaurantId,
      name,
      price,
      category,
      image,
    });

    res.json({ success: true, item });
  } catch (err) {
    console.error("Menu create error:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
