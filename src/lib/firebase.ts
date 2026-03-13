// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBEyR7R8g3Ze_yASmU6UJgHt2tL_Ad7fLc",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "console-zone.firebaseapp.com",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://console-zone-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "console-zone",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "console-zone.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "27387199701",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:27387199701:web:50bbb9916b9e09ab24e25c",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6L7V22719Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
