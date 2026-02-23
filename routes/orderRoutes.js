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
   ADMIN: GET ALL ORDERS
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
   CREATE ORDER
======================= */
router.post("/create-order", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      location,
      mapLink,
      items,
      customerName,
      restaurantId,
      deliveryFee = 0,
      tip = 0,
      platformFee = 0
    } = req.body;

    if (!location || !customerName || !restaurantId) {
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

    const invalidItem = items.find(
      (item) => String(item.restaurantId) !== String(restaurantId)
    );

    if (invalidItem) {
      return res.status(400).json({
        success: false,
        message: "All items must belong to same restaurant",
      });
    }

    const itemsTotal = items.reduce(
      (sum, i) => sum + i.price * i.qty,
      0
    );

    const totalAmount =
      itemsTotal + platformFee + deliveryFee + tip;

    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    const order = new Order({
      user: userId,
      orderId: razorpayOrder.id,
      customerName,
      items,
      itemsTotal,
      platformFee,
      deliveryFee,
      tip,
      totalAmount,
      location,
      mapLink: mapLink || "",
      restaurantCode: restaurantId,
      razorpayOrderId: razorpayOrder.id,
      status: "PENDING",
    });

    await order.save();

    return res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      order,
    });

  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

const crypto = require("crypto");

router.post("/verify-payment", auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({
        success: false,
        message: "Invalid signature",
      });
    }

    // Update order status in DB
    await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: "CONFIRMED" }
    );

    res.json({ success: true });

  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

/* =======================
   MY ORDERS (CUSTOMER)
======================= */
router.get("/my-orders", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
    });

  } catch (err) {router.get
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
    const restaurantCode = req.user.restaurantCode;

    if (!restaurantCode) {
      return res.status(403).json({
        success: false,
        message: "Restaurant access only",
      });
    }

    // 🔥 FIXED HERE
    const orders = await Order.find({ restaurantCode })
      .sort({ createdAt: -1 });

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