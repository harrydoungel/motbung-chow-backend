const admin = require("firebase-admin");

// 🔥 Directly use the JSON file (no env, no parsing)
const serviceAccount = require("./firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;