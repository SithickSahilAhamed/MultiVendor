// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBN-0IvpsqfHULbddiauMFz9Dh3iL5aXw0",
  authDomain: "sunfara-500b0.firebaseapp.com",
  databaseURL: "https://sunfara-500b0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sunfara-500b0",
  storageBucket: "sunfara-500b0.firebasestorage.app",
  messagingSenderId: "678617069984",
  appId: "1:678617069984:web:c807a635452f3d1f6c4cc5",
  measurementId: "G-48EC735003"
};

// Export for both frontend and backend use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
