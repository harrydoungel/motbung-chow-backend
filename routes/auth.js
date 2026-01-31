const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const admin = require("firebase-admin");
const fs = require("fs");

/* ============================================
   ✅ FIREBASE ADMIN INITIALIZATION (ONCE)
============================================ */
try {
  if (!admin.apps.length) {
    // ✅ Option 1: Render ENV Variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("🔧 Firebase Admin Init from ENV...");

      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    // ✅ Option 2: Local JSON File (Dev Only)
    else if (fs.existsSync("./firebase-service-account.json")) {
      console.log("🔧 Firebase Admin Init from JSON file...");

      const serviceAccount = require("../firebase-service-account.json");

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    // ✅ Option 3: Mock Mode (No Firebase)
    else {
      console.log("⚠️ Firebase Admin NOT initialized → MOCK MODE");
    }
  }

  if (admin.apps.length > 0) {
    console.log("✅ Firebase Admin SDK Ready");
  }
} catch (err) {
  console.error("❌ Firebase Admin Init Failed:", err.message);
}

/* ============================================
   ✅ OTP LOGIN ROUTE (ONLY ONE)
   POST /api/auth/phone-login
============================================ */
router.post("/phone-login", async (req, res) => {
  console.log("📞 POST /api/auth/phone-login called");

  try {
    // ✅ Validate Body
    if (!req.body || !req.body.idToken) {
      return res.status(400).json({
        success: false,
        message: "idToken is required",
      });
    }

    const { idToken } = req.body;

    /* ============================================
       ✅ MOCK MODE (Firebase Missing)
    ============================================ */
    if (!admin.apps.length) {
      console.log("⚠️ MOCK LOGIN USED");

      const mockToken = jwt.sign(
        {
          id: "mock-user-" + Date.now(),
          phone: "9999999999",
          isMock: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Mock login success ✅",
        token: mockToken,
        user: {
          phone: "9999999999",
          isMock: true,
        },
      });
    }

    /* ============================================
       ✅ VERIFY FIREBASE ID TOKEN
    ============================================ */
    console.log("🔄 Verifying Firebase ID Token...");

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    console.log("✅ Firebase Verified UID:", decodedToken.uid);

    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number missing in Firebase token",
      });
    }

    /* ============================================
       ✅ CREATE SESSION JWT
    ============================================ */
    const sessionToken = jwt.sign(
      {
        id: decodedToken.uid,
        phone: phoneNumber,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("🎫 Session JWT Created Successfully");

    return res.json({
      success: true,
      message: "Login successful ✅",
      token: sessionToken,
      user: {
        uid: decodedToken.uid,
        phone: phoneNumber,
      },
    });
  } catch (error) {
    console.error("❌ LOGIN FAILED:", error.message);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
});

/* ============================================
   ✅ HEALTH CHECK
============================================ */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    firebaseInitialized: admin.apps.length > 0,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
