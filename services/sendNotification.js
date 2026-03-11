const admin = require("../firebaseAdmin");

async function sendNotification(token, title, body, url) {

  const message = {
    token: token,

    notification: {
      title: title,
      body: body
    },

    data: {
      url: url
    }
  };

  try {
    await admin.messaging().send(message);
    console.log("Notification sent");
  } catch (error) {
    console.error("Notification error:", error);
  }

}

module.exports = sendNotification;