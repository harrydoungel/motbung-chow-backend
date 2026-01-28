const functions = require('firebase-functions');
const app = require('./app');  // This loads your Express app from app.js

exports.api = functions.https.onRequest(app);