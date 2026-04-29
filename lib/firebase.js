import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnNEeBSgm3nsTMrp1-Za4QMPfZstDvknU",
  authDomain: "mit-vinkort.firebaseapp.com",
  projectId: "mit-vinkort",
  storageBucket: "mit-vinkort.appspot.com",
  messagingSenderId: "443813211125",
  appId: "1:443813211125:web:4b78be78a20764783ccebc",
  measurementId: "G-XECLNBLGYL"
};

// Forhindrer Next.js i at initialisere Firebase flere gange
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };