import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAfTsaEeiBGA05yRvg0ltwZYlbns9xDk38",
    authDomain: "pranjay-ec.firebaseapp.com",
    projectId: "pranjay-ec",
    storageBucket: "pranjay-ec.firebasestorage.app",
    messagingSenderId: "713668069063",
    appId: "1:713668069063:web:cd1902252d00177dbb60e2"
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
