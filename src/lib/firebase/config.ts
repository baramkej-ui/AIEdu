import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBetsengyPMvOOJcITjmO6pnsyYqkGlCTY",
  authDomain: "studio-608619568-fce2e.firebaseapp.com",
  projectId: "studio-608619568-fce2e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: "173584322057",
  appId: "1:173584322057:web:29f74256e4b408f83032d8",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
