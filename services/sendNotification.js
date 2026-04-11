const admin = require("../firebaseAdmin");

async function sendNotification(token, title, body, url) {

  const message = {
    token: token,

    // ✅ DATA ONLY (IMPORTANT)
    data: {
      title: title,
      body: body,
      url: url || "/"
    },

    android: {
      priority: "high"
    },

    webpush: {
      headers: {
        Urgency: "high"
      }
    }
  };

  try {
    await admin.messaging().send(message);
    console.log("🔔 Notification sent (data push)");
  } catch (error) {
    console.error("Notification error:", error);
  }
}

module.exports = sendNotification;