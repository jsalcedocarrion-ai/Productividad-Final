// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCDlav5fgyUIXcYYmMedRal6QgCpOH-o0A",
  authDomain: "gestion-de-productividad.firebaseapp.com",
  projectId: "gestion-de-productividad",
  storageBucket: "gestion-de-productividad.firebasestorage.app",
  messagingSenderId: "610866819808",
  appId: "1:610866819808:web:02581000e1b71b75121685",
  measurementId: "G-WJCEX6FGGQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);