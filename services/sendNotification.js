const admin = require("../firebaseAdmin");

async function sendNotification(token, title, body, url) {

  const message = {
    token,

    notification: {
      title,
      body
    },

    data: {
      url: url || "/"
    },

    android: {
      priority: "high"
    },

    apns: {
      headers: {
        "apns-priority": "10"
      }
    },

    webpush: {
      headers: {
        Urgency: "high"
      },
      notification: {
        title,
        body,
        icon: "/images/icon-192.png",
        badge: "/images/icon-192.png"
      }
    }
  };

  await admin.messaging().send(message);
}

module.exports = sendNotification;