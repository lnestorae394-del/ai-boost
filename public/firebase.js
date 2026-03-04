import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAB7sETTaO3mKj1OdBjtdeIEGeozeVXDVM",
  authDomain: "ai-boost-10540.firebaseapp.com",
  projectId: "ai-boost-10540",
  storageBucket: "ai-boost-10540.firebasestorage.app",
  messagingSenderId: "1024595520009",
  appId: "1:1024595520009:web:650af4d5912ef70da5e6d8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;
