const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const admin = require("firebase-admin");

/* =======================
   FIREBASE ADMIN INITIALIZATION
======================= */
try {
  // Check if Firebase Admin is already initialized
  if (!admin.apps.length) {
    // Try to get service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("🔧 Initializing Firebase Admin from env variable...");
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } 
    // Try to load from service account file
    else if (require("fs").existsSync("./firebase-service-account.json")) {
      console.log("🔧 Initializing Firebase Admin from service account file...");
      const serviceAccount = require("../firebase-service-account.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    // For development/testing without Firebase
    else {
      console.log("⚠️  Firebase service account not found. Running in MOCK mode.");
      console.log("ℹ️  To enable real OTP verification:");
      console.log("1. Download service account from Firebase Console");
      console.log("2. Save as firebase-service-account.json in backend folder");
      console.log("3. Or set FIREBASE_SERVICE_ACCOUNT env variable");
    }
  }
  
  if (admin.apps.length > 0) {
    console.log("✅ Firebase Admin SDK initialized");
    console.log("📊 Project ID:", admin.app().options.projectId);
  }
} catch (error) {
  console.error("❌ Firebase Admin initialization failed:", error.message);
}

/* =======================
   REAL FIREBASE OTP VERIFICATION
======================= */
router.post("/login", async (req, res) => {
  console.log("📞 /api/auth/login called - REAL VERIFICATION");
  
  try {
    const { idToken } = req.body;
    console.log("Request received with idToken:", idToken ? "Yes (length: " + idToken.length + ")" : "No");

    if (!idToken) {
      console.log("❌ No idToken provided");
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required"
      });
    }

    // If Firebase Admin is not initialized, fall back to mock mode
    if (!admin.apps.length) {
      console.log("⚠️  Firebase Admin not available. Using MOCK mode.");
      console.log("⚠️  Set up Firebase Admin for real OTP verification.");
      
      // Mock verification for development
      const mockPhone = "9876543210";
      const token = jwt.sign(
        { 
          id: "mock-user-" + Date.now(), 
          phone: mockPhone,
          isMock: true 
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      console.log("✅ Mock login successful");
      
      return res.json({
        success: true,
        message: "Login successful (MOCK MODE - Set up Firebase for real verification)",
        token,
        user: {
          id: "mock-user-id",
          phone: mockPhone,
          isMock: true
        },
        warning: "Running in mock mode. Set up Firebase Admin for real OTP verification."
      });
    }

    // REAL Firebase token verification
    console.log("🔄 Verifying Firebase ID token with Admin SDK...");
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    console.log("✅ Firebase token verified successfully!");
    console.log("👤 User ID:", decodedToken.uid);
    console.log("📱 Phone:", decodedToken.phone_number || "No phone");
    console.log("📧 Email:", decodedToken.email || "No email");
    console.log("🔧 Issuer:", decodedToken.iss);
    console.log("🕒 Expires:", new Date(decodedToken.exp * 1000).toLocaleString());

    // Get additional user info
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(decodedToken.uid);
      console.log("📋 User metadata fetched");
    } catch (err) {
      console.log("ℹ️ Could not fetch user details:", err.message);
    }

    const phoneNumber = decodedToken.phone_number || userRecord?.phoneNumber;
    
    if (!phoneNumber) {
      console.log("⚠️  No phone number found in token");
      return res.status(400).json({
        success: false,
        message: "Phone number not found in user profile"
      });
    }

    // Create your custom JWT
    const token = jwt.sign(
      {
        id: decodedToken.uid,
        phone: phoneNumber,
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        isVerified: true,
        authTime: decodedToken.auth_time
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("🎫 Custom JWT created for:", phoneNumber);

    // Prepare user data
    const userData = {
      id: decodedToken.uid,
      phone: phoneNumber,
      email: decodedToken.email || null,
      displayName: userRecord?.displayName || null,
      photoURL: userRecord?.photoURL || null,
      isNewUser: userRecord?.metadata?.creationTime === userRecord?.metadata?.lastSignInTime,
      createdAt: userRecord?.metadata?.creationTime || new Date().toISOString(),
      lastLoginAt: userRecord?.metadata?.lastSignInTime || new Date().toISOString()
    };

    console.log("🚀 REAL login successful for:", phoneNumber);
    
    res.json({
      success: true,
      message: "Login successful with Firebase OTP",
      token,
      user: userData,
      isNewUser: userData.isNewUser
    });

  } catch (error) {
    console.error("❌ Firebase token verification failed:", error.message);
    
    // Handle Firebase specific errors
    let statusCode = 401;
    let errorMessage = "Authentication failed";
    let errorCode = error.code || "unknown_error";

    switch (error.code) {
      case "auth/id-token-expired":
        errorMessage = "Firebase token has expired. Please login again.";
        break;
      case "auth/id-token-revoked":
        errorMessage = "Firebase token has been revoked. Please login again.";
        break;
      case "auth/invalid-id-token":
        errorMessage = "Invalid Firebase token.";
        break;
      case "auth/argument-error":
        errorMessage = "Invalid token format.";
        statusCode = 400;
        break;
      default:
        errorMessage = `Authentication error: ${error.message}`;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      debug: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

/* =======================
   DEBUG ENDPOINTS
======================= */
router.get("/test-firebase", async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.json({
        success: false,
        message: "Firebase Admin not initialized",
        instructions: "Set up firebase-service-account.json or FIREBASE_SERVICE_ACCOUNT env variable"
      });
    }

    // Test Firebase connection
    const listResult = await admin.auth().listUsers(5);
    
    res.json({
      success: true,
      message: "Firebase Admin is working",
      projectId: admin.app().options.projectId,
      totalUsers: listResult.users.length,
      sampleUsers: listResult.users.map(u => ({
        uid: u.uid,
        phone: u.phoneNumber,
        email: u.email,
        created: u.metadata.creationTime
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Firebase test failed",
      error: error.message
    });
  }
});

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Auth service is running",
    firebaseInitialized: admin.apps.length > 0,
    timestamp: new Date().toISOString()
  });
});

console.log("✅ Routes registered in auth.js");

module.exports = router;