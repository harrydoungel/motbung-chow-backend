const express = require("express");
const router = express.Router();
const crypto = require("crypto");

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
   ADMIN: GET ALL ORDERS (OPTIONAL SUPERADMIN)
======================= */
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ status: "CONFIRMED" })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Fetch all orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =======================
   CREATE ORDER (ONLINE)
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
      platformFee = 0,
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

    // 🔥 Auto-clean old abandoned pending orders (15 mins)
    await Order.deleteMany({
      user: userId,
      status: "PENDING",
      createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) }
    });

    const itemsTotal = items.reduce(
      (sum, i) => sum + i.price * i.qty,
      0
    );

    const totalAmount =
      itemsTotal + platformFee + deliveryFee + tip;

    // 🔥 Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    // 🔥 Save as PENDING
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
    });

  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* =======================
   VERIFY PAYMENT
======================= */
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

    // ✅ Only mark as CONFIRMED after payment success
    await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "CONFIRMED",
        razorpayPaymentId: razorpay_payment_id,
      }
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
   RAZORPAY WEBHOOK
======================= */

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid webhook signature");
      return res.status(400).json({ success: false });
    }

    const event = JSON.parse(req.body.toString());

    // Payment captured (SUCCESS)
    if (event.event === "payment.captured") {

      const razorpayOrderId = event.payload.payment.entity.order_id;
      const paymentId = event.payload.payment.entity.id;

      const updated = await Order.findOneAndUpdate(
        { razorpayOrderId },
        {
          status: "CONFIRMED",
          razorpayPaymentId: paymentId,
        },
        { new: true }
      );

      console.log("✅ Webhook confirmed order:", razorpayOrderId);
    }

    // Payment failed
    if (event.event === "payment.failed") {

      const razorpayOrderId = event.payload.payment.entity.order_id;

      await Order.findOneAndUpdate(
        { razorpayOrderId },
        { status: "FAILED" }
      );

      console.log("❌ Webhook marked order FAILED:", razorpayOrderId);
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ success: false });
  }
});

/* =======================
   MY ORDERS (CUSTOMER)
======================= */
router.get("/my-orders", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({
      user: userId,
      status: "CONFIRMED"
    }).sort({ createdAt: -1 });

    res.json({ success: true, orders });

  } catch (err) {
    console.error("Fetch my orders error:", err);
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

    // ✅ Only show confirmed orders to restaurant admin
    const orders = await Order.find({
      restaurantCode,
      status: "CONFIRMED"
    }).sort({ createdAt: -1 });

    res.json({ success: true, orders });

  } catch (err) {
    console.error("Fetch restaurant orders error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/by-restaurant/:id", async (req, res) => {
  try {
    const restaurantId = req.params.id;

    const orders = await Order.find({ restaurantId })
      .sort({ createdAt: -1 });

    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    res.json({
      success: true,
      totalOrders: orders.length,
      totalRevenue,
      orders
    });

  } catch (err) {
    console.error("Restaurant orders error:", err);
    res.status(500).json({ success: false });
  }
});
module.exports = router;