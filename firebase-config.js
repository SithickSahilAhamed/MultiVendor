// Firebase Configuration
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "sunfara-YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "sunfara-YOUR_PROJECT_ID",
  storageBucket: "sunfara-YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Export for both frontend and backend use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
