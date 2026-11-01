// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app-check.js";

// Firebase configuration (web apiKey is public by design — protect with App Check + Auth domains)
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

/**
 * SEC-003 — Firebase App Check (opt-in).
 * Set window.SUNFARA_APPCHECK_SITE_KEY to the reCAPTCHA v3 site key from the
 * Firebase console before this module loads. When unset, App Check stays off
 * so local/dev and current prod deploys are unchanged until ops enables it.
 * See docs/ops/APP_CHECK_OPS.md for residual console steps (no prod flips here).
 */
let appCheck = null;
const appCheckSiteKey =
  (typeof window !== "undefined" && window.SUNFARA_APPCHECK_SITE_KEY) ||
  (typeof globalThis !== "undefined" && globalThis.SUNFARA_APPCHECK_SITE_KEY) ||
  "";

if (appCheckSiteKey) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn("[Sunfara] App Check init failed; continuing without attestation:", err?.message || err);
  }
}

// Export Firebase modules for use in other files
const authService = { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, sendEmailVerification, GoogleAuthProvider, signInWithPopup };
export { app, analytics, auth, database, storage, db, authService, appCheck };
