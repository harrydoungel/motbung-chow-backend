const admin = require("firebase-admin");

// ✅ Use JSON file directly (correct method)
const serviceAccount = require("./firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;