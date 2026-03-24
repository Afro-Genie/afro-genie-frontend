import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDEyw5ZYV5v4pcIM1lVmMHeOHGrnd9wY-M",
  authDomain: "afrogenie.firebaseapp.com",
  projectId: "afrogenie",
  storageBucket: "afrogenie.firebasestorage.app",
  messagingSenderId: "848394587261",
  appId: "1:848394587261:web:904a2946e0bc0ec9ac3514",
  measurementId: "G-YNWYDMNHES"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

if (typeof window !== 'undefined' && import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { app, analytics, auth, db, storage, functions };


