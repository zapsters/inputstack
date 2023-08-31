//FIREBASE DATABASE ---------------------------
var firebaseConfig = {
  apiKey: "AIzaSyBTnT9iIONR7BLIaOstRXdl_VlIwxYRA24",
  authDomain: "zapsterdatabase.firebaseapp.com",
  databaseURL: "https://zapsterdatabase-default-rtdb.firebaseio.com",
  projectId: "zapsterdatabase",
  storageBucket: "zapsterdatabase.appspot.com",
  messagingSenderId: "847821198477",
  appId: "1:847821198477:web:82f54828105fe50229bec4",
  measurementId: "G-YC79MNPTH4",
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var database = firebase.database();
var databaseRef = firebase.database().ref();
//END OF DATABASE CODE
/* ======================================================== */
