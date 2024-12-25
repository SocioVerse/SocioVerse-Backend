const admin = require("firebase-admin");
const serviceAccount = require("../../secrets/firebase-serviceAccountKey.js");

const initializeFirebase = () => {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
};

module.exports = initializeFirebase;
