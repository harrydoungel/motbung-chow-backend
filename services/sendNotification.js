const admin = require("../firebaseAdmin");

async function sendNotification(token, title, body, url) {

  const message = {
    token: token,

    data: {
      title: title,
      body: body,
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
        Urgency: "high",
        TTL: "0"
      }
    }
  };

  await admin.messaging().send(message);
}

module.exports = sendNotification;