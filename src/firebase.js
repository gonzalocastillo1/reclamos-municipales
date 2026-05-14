import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0pPwqza4uqbc2GsqgmVGaxZfdQXDr0yo",
  authDomain: "reclamos-municipales.firebaseapp.com",
  projectId: "reclamos-municipales",
  storageBucket: "reclamos-municipales.firebasestorage.app",
  messagingSenderId: "311502730384",
  appId: "1:311502730384:web:d61e8cf3d262a276af9415"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);