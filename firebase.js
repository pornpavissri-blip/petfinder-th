import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBWZVB-9wsPLRVT2E9QZGHvToIsepCqx8c",
  authDomain: "petfinder-th.firebaseapp.com",
  projectId: "petfinder-th",
  storageBucket: "petfinder-th.firebasestorage.app",
  messagingSenderId: "490437118084",
  appId: "1:490437118084:web:2b24b6b3b83e012c0bdad1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);