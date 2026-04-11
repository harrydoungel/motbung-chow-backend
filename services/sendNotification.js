const admin = require("../firebaseAdmin");

async function sendNotification(token, title, body, url) {

  const message = {
    token: token,

    notification: {
      title: title,
      body: body
    },

    data: {
      url: url || "/"
    },

    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "orders",
        priority: "max",
        defaultVibrateTimings: true
      }
    },

    webpush: {
      headers: {
        Urgency: "high"
      },
      notification: {
        requireInteraction: true,
        vibrate: [300,100,300,100,300],
        sound: "default"
      }
    }
  };

  try {
    await admin.messaging().send(message);
    console.log("🔔 Notification sent with sound");
  } catch (error) {
    console.error("Notification error:", error);
  }
}

module.exports = sendNotification;