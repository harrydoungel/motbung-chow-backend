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
   CREATE ORDER (COD + ONLINE)
======================= */
router.post("/create-order", auth, async (req, res) => {
  try {
    // ✅ Firebase UID from JWT
    const userId = req.user.id;

    console.log("✅ Creating order for Firebase UID:", userId);

    // ✅ Get ALL fields including customer name
    const { amount, location, mapLink, paymentMethod, items, customerName } = req.body;

    console.log("📦 Customer name received:", customerName);
    console.log("📦 Items received:", items);
    console.log("📦 Items length:", items?.length || 0);

    // ✅ Validate ALL required fields including customer name
    if (!amount || !location || !paymentMethod || !customerName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: amount, location, paymentMethod, or customer name",
      });
    }

    /* =======================
       CASH ON DELIVERY
    ======================= */
    if (paymentMethod === "cod") {
      const order = new Order({
        user: userId,
        orderId: "COD_" + Date.now(),
        customerName: customerName, // ✅ CRITICAL: Save customer name
        items: items || [],
        amount,
        location,
        mapLink: mapLink || "",
        paymentMethod: "COD",
        status: "COD_PENDING",
      });

      await order.save();

      console.log("✅ COD Order saved:", order.orderId);
      console.log("👤 Customer:", customerName);

      return res.json({
        success: true,
        message: "Order placed successfully (COD)",
        order,
      });
    }

    /* =======================
       ONLINE PAYMENT
    ======================= */
    if (paymentMethod === "online") {
      // ✅ Create Razorpay Order
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100, // convert ₹ → paise
        currency: "INR",
        receipt: "rcpt_" + Date.now(),
      });

      // ✅ Save in DB
      const order = new Order({
        user: userId,
        orderId: razorpayOrder.id,
        customerName: customerName, // ✅ CRITICAL: Save customer name
        items: items || [],
        amount,
        location,
        mapLink: mapLink || "",
        paymentMethod: "ONLINE",
        status: "PENDING",
      });

      await order.save();

      console.log("✅ Online Order saved:", order.orderId);
      console.log("👤 Customer:", customerName);

      return res.json({
        success: true,
        message: "Order created. Complete payment.",
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid payment method",
    });
  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

/* =======================
   MY ORDERS (LOGGED IN USER)
======================= */
router.get("/my-orders", auth, async (req, res) => {
  try {
    const userId = req.user.id; // ✅ Firebase UID

    console.log("✅ Fetching orders for user:", userId);

    const orders = await Order.find({ user: userId }).sort({
      createdAt: -1,
    });

    console.log(`✅ Found ${orders.length} orders`);

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

module.exports = router;