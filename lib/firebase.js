import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- 1. DIT NUVÆRENDE VINKORT ---
const firebaseConfig = {
  apiKey: "AIzaSyAnNEeBSgm3nsTMrp1-Za4QMPfZstDvknU",
  authDomain: "mit-vinkort.firebaseapp.com",
  projectId: "mit-vinkort",
  storageBucket: "mit-vinkort.appspot.com",
  messagingSenderId: "443813211125",
  appId: "1:443813211125:web:4b78be78a20764783ccebc",
  measurementId: "G-XECLNBLGYL"
};

// --- 2. DEN NYE VIP-FORBINDELSE ---
const vipFirebaseConfig = { // Rettet til stort F her
  apiKey: "AIzaSyBiQdRBKhS2TdW0x3hxXvPhdK3jKG0gByk",
  authDomain: "guestportal-e0d8b.firebaseapp.com",
  projectId: "guestportal-e0d8b",
  storageBucket: "guestportal-e0d8b.firebasestorage.app",
  messagingSenderId: "503127888879",
  appId: "1:503127888879:web:b60958ac246889cc471c1a"
};

// Forhindrer Next.js i at initialisere Firebase flere gange
// VIGTIGT: Hoved-appen skal initialiseres først!
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Derefter initialiserer vi VIP-appen
const vipApp = getApps().find(a => a.name === "VIP_APP") 
    ? getApp("VIP_APP") 
    : initializeApp(vipFirebaseConfig, "VIP_APP");

export { app, auth, db };
// Eksportér VIP-databasen som 'vipDb'
export const vipDb = getFirestore(vipApp);