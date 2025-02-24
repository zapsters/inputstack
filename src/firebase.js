import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { GoogleAuthProvider, getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBSsnvUGNluntsXQ1K1pUIJk0u0GU031yg",
  authDomain: "inputstack.firebaseapp.com",
  databaseURL: "https://inputstack.firebaseio.com",
  projectId: "inputstack",
  storageBucket: "inputstack.firebasestorage.app",
  messagingSenderId: "227881556215",
  appId: "1:227881556215:web:8c0a5cd5e79f19cd449bf2",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const provider = new GoogleAuthProvider();
export const database = getDatabase(app);
export const auth = getAuth();

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  console.log("FIRESTORE EMULATOR ACTIVE -- CALL ");
  connectDatabaseEmulator(database, "localhost", 9000);
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
}
