const sendNotification = require("../services/sendNotification");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
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

const { restaurants } = req.query;

let filter = {
  status: { $in: ["CONFIRMED", "OUT_FOR_DELIVERY"] }
};

if (restaurants && restaurants !== "ALL") {

  const ids = restaurants
    .split(",")
    .map(id => new mongoose.Types.ObjectId(id));

  filter.restaurantId = { $in: ids };

}

const orders = await Order.find(filter)
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
      phone,
      address,
      restaurantId,
      deliveryFee = 0,
      tip = 0,
      platformFee = 0,
    } = req.body;

// Save latest user info to profile
await User.findByIdAndUpdate(userId, {
  name: customerName,
  phone: phone,
  address: address
});

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
      phone,
      address,
      items,
      itemsTotal,
      platformFee,
      deliveryFee,
      tip,
      totalAmount,
      location: typeof location === "object"
        ? `${location.lat},${location.lng}`
        : location,

      mapLink: mapLink || "",
      restaurantId: restaurantId,
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
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "CONFIRMED",
        razorpayPaymentId: razorpay_payment_id,
      },
      { new: true }
    );

    const io = req.app.get("io");
    if (io && order?.restaurantId) {
      io.to(order.restaurantId.toString()).emit("newOrder", order);
    }

    if (order && order.fcmToken) {
      sendNotification(
        order.fcmToken,
        "Order Confirmed",
        "Your order has been confirmed!",
        "/?tab=orders"
      );
    }

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

      const io = req.app.get("io");
      if (io && updated?.restaurantId && updated.status === "CONFIRMED") {
        io.to(updated.restaurantId.toString()).emit("newOrder", updated);
      }

      if (updated && updated.fcmToken) {
        sendNotification(
          updated.fcmToken,
          "Order Confirmed",
          "Your order has been confirmed!",
          "/?tab=orders"
        );
      }

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
      status: { $in: ["CONFIRMED","OUT_FOR_DELIVERY","DELIVERED"] }
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
    const restaurantId = req.user.restaurantId;

    if (!restaurantId) {
      return res.status(403).json({
        success: false,
        message: "Restaurant access only",
      });
    }

    const orders = await Order.find({
      restaurantId,
      status: { $in: ["CONFIRMED","OUT_FOR_DELIVERY","DELIVERED"] }
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

// ==============================
// RESTAURANT ANALYTICS
// ==============================
router.get("/by-restaurant/:id", async (req, res) => {
  try {

    const restaurantId = req.params.id;

    const orders = await Order.find({
      restaurantId: restaurantId,
      status: { $in: ["CONFIRMED","OUT_FOR_DELIVERY","DELIVERED"] }
    }).sort({ createdAt: -1 });

    const totalOrders = orders.length;

    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;

    orders.forEach(order => {

      const itemsTotal = order.itemsTotal || 0;
      const platformFee = itemsTotal * 0.10;
      const finalEarning = itemsTotal - platformFee;

      totalRevenue += finalEarning;

      if(order.paymentStatus === "paid"){
        paidRevenue += finalEarning;
      } else {
        pendingRevenue += finalEarning;
      }

    });

    res.json({
      success: true,
      totalOrders,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      orders
    });

  } catch (err) {
    console.error("Restaurant analytics error:", err);
    res.status(500).json({ success: false });
  }
});
// ==============================
// CUSTOMER ANALYTICS
// ==============================
router.get("/by-customer/:id", async (req, res) => {
  try {

    // Your Order model uses "user"
    const orders = await Order.find({
      user: req.params.id
    }).sort({ createdAt: -1 });

    const totalSpent = orders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    res.json({
      success: true,
      totalOrders: orders.length,
      totalSpent,
      orders
    });

  } catch (err) {
    console.error("Customer analytics error:", err);
    res.status(500).json({ success: false });
  }
});

// ==============================
// DRIVER ANALYTICS
// ==============================
router.get("/by-driver/:id", async (req, res) => {
  try {

    const orders = await Order.find({
      deliveryPartnerId: req.params.id,
      status: "DELIVERED"
    }).sort({ createdAt: -1 });

    const totalEarnings = orders.reduce(
      (sum, o) => sum + (o.deliveryFee || 0),
      0
    );

    res.json({
      success: true,
      totalDeliveries: orders.length,
      totalEarnings,
      orders
    });

  } catch (err) {
    console.error("Driver analytics error:", err);
    res.status(500).json({ success: false });
  }
});

// ==============================
// MARK RESTAURANT PAYMENTS AS PAID
// ==============================
router.post("/mark-paid/:restaurantId", async (req,res)=>{
  try{

    const restaurantId = req.params.restaurantId;

    await Order.updateMany(
      {
        restaurantId: restaurantId,
        status: "CONFIRMED",
      },
      {
        $set: { paymentStatus: "paid" }
      }
    );

    // 🔔 notify admin panels
    const io = req.app.get("io");
    if(io){
      io.emit("paymentUpdated", { restaurantId });
    }

    res.json({success:true});

  }catch(err){
    console.error("Mark paid error:",err);
    res.status(500).json({success:false});
  }
});

router.post("/start-delivery/:orderId", async (req, res) => {
  try {

    const { driverPhone } = req.body;

    // 🔎 Validation
    if (!driverPhone) {
      return res.status(400).json({
        success: false,
        message: "Driver phone missing"
      });
    }

    const order = await Order.findOneAndUpdate(
      {
        $or: [
          { orderId: req.params.orderId },
          { razorpayOrderId: req.params.orderId }
        ]
      },
      {
        status: "OUT_FOR_DELIVERY",
        deliveryPartnerId: driverPhone,
        driverPhone: driverPhone
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(order.restaurantId.toString()).emit("orderUpdated", order);
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Start delivery error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

router.post("/deliver/:orderId", async (req, res) => {
  try {

    const order = await Order.findOneAndUpdate(
      {
        $or: [
          { orderId: req.params.orderId },
          { razorpayOrderId: req.params.orderId }
        ]
      },
      { status: "DELIVERED" },
      { new: true }
    );

    if (!order) {
      return res.json({ success: false });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(order.restaurantId.toString()).emit("orderUpdated", order);
    }

    if (order.fcmToken) {
      sendNotification(
        order.fcmToken,
        "Order Delivered",
        "🎉 Your order has been delivered!",
        "/?tab=orders"
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

router.get("/single/:orderId", async (req, res) => {
  try {

    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {
      return res.json({ success:false });
    }

    // 🔥 FIX: normalize address
    const fixedOrder = {
      ...order.toObject(),
      address: order.address || order.location || "N/A"
    };

    res.json({
      success: true,
      order: fixedOrder
    });

  } catch(err){
    console.error(err);
    res.status(500).json({ success:false });
  }
});

router.get("/restaurants", async (req,res)=>{

  try{

    const restaurants = await Restaurant.find({},{
      name:1
    });

    res.json({
      success:true,
      restaurants
    });

  }catch(err){
    res.status(500).json({success:false});
  }

});

module.exports = router;