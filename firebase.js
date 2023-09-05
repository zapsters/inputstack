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
// User Variables
var provider = new firebase.auth.GoogleAuthProvider();
var user = null;
var token = null;

function signInButton() {
  firebase.auth().signInWithRedirect(provider);
}

function getUserData() {
  //firebase.auth().signInWithRedirect(provider);
  firebase
    .auth()
    .getRedirectResult()
    .then((result) => {
      if (result.credential) {
        /** @type {firebase.auth.OAuthCredential} */
        var credential = result.credential;

        // This gives you a Google Access Token. You can use it to access the Google API.
        token = credential.accessToken;
      }
      // The signed-in user info.
      user = result.user;
      // IdP data available in result.additionalUserInfo.profile.
    })
    .catch((error) => {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
      // ...
    });
}
