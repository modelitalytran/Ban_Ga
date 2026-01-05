import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Cấu hình Firebase từ biến môi trường
const firebaseConfig = {
  apiKey: process.env.VITE_API_KEY_FIREBASE,
  authDomain: process.env.VITE_AUTH_DOMAIN,
  projectId: process.env.VITE_PROJECT_ID,
  storageBucket: process.env.VITE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_APP_ID
};

// Initialize Firebase
// Note: Nếu chưa cấu hình biến môi trường, app sẽ báo lỗi.
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);