import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Cấu hình trực tiếp từ giá trị bạn cung cấp
const firebaseConfig = {
  apiKey: "AIzaSyA3baM8X_RawiJXLtIFYr_FRZ6G1kmqtu0",
  authDomain: "trai-ga-quan-ly.firebaseapp.com",
  projectId: "trai-ga-quan-ly",
  storageBucket: "trai-ga-quan-ly.firebasestorage.app",
  messagingSenderId: "501735768824",
  appId: "1:501735768824:web:1c1bff78c290d05612310d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);