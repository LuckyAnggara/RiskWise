
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY_REPLACE_ME",
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN_REPLACE_ME",
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID_REPLACE_ME",
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET_REPLACE_ME",
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID_REPLACE_ME",
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID_REPLACE_ME",
//   measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Opsional
// };

const firebaseConfig = {
  apiKey: "AIzaSyDQZb6sBL2gt0NQOfnX4NJ9GTG7P99NpKQ",
  authDomain: "rikswise-d5d7f.firebaseapp.com",
  projectId: "rikswise-d5d7f",
  storageBucket: "rikswise-d5d7f.firebasestorage.app",
  messagingSenderId: "1092348163361",
  appId: "1:1092348163361:web:4554ae2c6a478953cf7a60"
};


// Inisialisasi Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app); // Inisialisasi Firestore

export { app, auth, db };
