const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  console.log("🔐 Auth middleware triggered for:", req.url);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("❌ No authorization header");
    return res.status(401).json({
      success: false,
      message: "No token, authorization denied",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log("❌ Invalid authorization format");
    return res.status(401).json({
      success: false,
      message: "Invalid token format",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    console.log("❌ Token empty");
    return res.status(401).json({
      success: false,
      message: "Token is empty",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ JWT verified");

    req.user = {
      id: new mongoose.Types.ObjectId(decoded.id),
      phone: decoded.phone,
      restaurantId: decoded.restaurantId,
      role: decoded.role,
    };

    console.log("✅ Request user set:", req.user);
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};
