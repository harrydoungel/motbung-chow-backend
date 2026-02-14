const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

module.exports = function (req, res, next) {
  console.log("🔐 Auth middleware triggered for:", req.url);
  
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("❌ No authorization header");
    return res.status(401).json({ 
      success: false,
      message: "No token, authorization denied" 
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log("❌ Invalid authorization format. Should be: Bearer <token>");
    console.log("Received:", authHeader.substring(0, 50));
    return res.status(401).json({ 
      success: false,
      message: "Invalid token format" 
    });
  }

  const token = authHeader.split(" ")[1];
  
  if (!token) {
    console.log("❌ Token is empty");
    return res.status(401).json({ 
      success: false,
      message: "Token is empty" 
    });
  }

  console.log("🔐 Token received, length:", token.length);
  console.log("🔐 Token preview:", token.substring(0, 30) + "...");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ JWT verified successfully");
    console.log("📋 Decoded payload:", decoded);
    
    let userId = decoded.id;
    
    // Validate and convert to ObjectId
    if (!userId) {
      console.log("❌ No user ID in JWT payload");
      return res.status(401).json({ 
        success: false,
        message: "Invalid token: no user ID" 
      });
    }
    
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userId = new mongoose.Types.ObjectId(userId);
      console.log("✅ Converted to ObjectId:", userId);
    } else {
      console.log("⚠️ User ID is not a valid ObjectId:", userId);
    }
    
    req.user = {
      id: userId,
      phone: decoded.phone,
      restaurantId: decoded.restaurantId
    };

    console.log("✅ Request user set:", req.user);
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token",
        error: err.message 
      });
    }
    
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false,
        message: "Token expired" 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: "Authentication failed" 
    });
  }
};



