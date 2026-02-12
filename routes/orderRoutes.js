const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const Order = require("../models/Order");

const Razorpay = require("razorpay");

/* =======================
   RAZORPAY INSTANCE
======================= */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =======================
   ADMIN: GET ALL ORDERS (SUPER ADMIN ONLY – protect later)
======================= */
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ Fetch all orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =======================
   CREATE ORDER (SINGLE RESTAURANT ONLY)
======================= */
router.post("/create-order", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      location,
      mapLink,
      paymentMethod,
      items,
      customerName,
      restaurantId,
    } = req.body;

    /* ========= BASIC VALIDATION ========= */
    if (!location || !paymentMethod || !customerName || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    /* ========= ENSURE ALL ITEMS BELONG TO SAME RESTAURANT ========= */
    const invalidItem = items.find(
      (item) => String(item.restaurantId) !== String(restaurantId)
    );

    if (invalidItem) {
      return res.status(400).json({
        success: false,
        message: "All items must belong to the same restaurant",
      });
    }

    /* ========= CALCULATE TOTAL ========= */
    const amount = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    /* ========= CREATE RAZORPAY ORDER (ONLINE ONLY) ========= */
    let razorpayOrderId = null;

    if (paymentMethod === "online") {
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100, // paise
        currency: "INR",
        receipt: "rcpt_" + Date.now(),
      });

      razorpayOrderId = razorpayOrder.id;
    }

    /* ========= CREATE ORDER DOCUMENT ========= */
    const order = new Order({
      user: userId,
      orderId:
        paymentMethod === "cod"
          ? "COD_" + Date.now()
          : razorpayOrderId,

      customerName,
      items,
      amount,

      location,
      mapLink: mapLink || "",

      paymentMethod: paymentMethod === "cod" ? "COD" : "ONLINE",
      status: paymentMethod === "cod" ? "COD_PENDING" : "PENDING",

      restaurantId,
    });

    await order.save();

    return res.json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =======================
   MY ORDERS (CUSTOMER)
======================= */
router.get("/my-orders", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("❌ Fetch my orders error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =======================
   RESTAURANT: GET OWN ORDERS
======================= */
router.get("/restaurant", auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;

    if (!restaurantId) {
      return res.status(403).json({
        success: false,
        message: "Restaurant access only",
      });
    }

    const orders = await Order.find({ restaurantId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("❌ Fetch restaurant orders error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
