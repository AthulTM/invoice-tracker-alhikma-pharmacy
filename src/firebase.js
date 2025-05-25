// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDsqxAWgz783D5ohuz3xKNjHXdVzPaKWqU",
  authDomain: "invoice-tracker-alhikma.firebaseapp.com",
  projectId: "invoice-tracker-alhikma",
  storageBucket: "invoice-tracker-alhikma.firebasestorage.app",
  messagingSenderId: "971974880016",
  appId: "1:971974880016:web:fb1ad78278f74ed2d9d395",
  measurementId: "G-V9WXKGLPBW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore DB
const db = getFirestore(app);

export { db };
