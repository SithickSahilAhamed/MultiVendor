// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const db = getFirestore(app);

// Export Firebase modules for use in other files
const authService = { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup };
export { app, analytics, auth, database, storage, db, authService };
