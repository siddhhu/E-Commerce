import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAfTsaEeiBGA05yRvg0ltwZYlbns9xDk38",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pranjay-ec.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pranjay-ec",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pranjay-ec.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "713668069063",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:713668069063:web:cd1902252d00177dbb60e2"
};

// Initialize Firebase only if the API key is present
let app;
let auth: any;

if (firebaseConfig.apiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
} else {
    // This part is now unreachable due to hardcoding, but kept for structure
    console.warn("Firebase: API Key configuration missing.");
}

export { app, auth };
