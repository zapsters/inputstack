import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  deleteUser,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { updateUserState } from "./index.js";
import * as alertManager from "./alert.js";
import * as $ from "jquery";

const auth = getAuth();
var isCreatingRoom = false;
var isJoiningRoom = false;

// Create Lobby Logic
export async function createRoomFunction(dev = false) {
  if (isCreatingRoom) throw new Error("Already creating room");
  if (auth.currentUser.isAnonymous) throw new Error("An account is required to create a room");
  var newRoomCode = generateRandomLetters(4);
  if (dev) newRoomCode = "dev";

  const db = getDatabase();
  await set(ref(db, "rooms/" + newRoomCode), {
    host: auth.currentUser.uid,
  });

  // firebase
  //   .database()
  //   .ref(databasePrefix + roomcode + "/users")
  //   .set({});
  // firebase
  //   .database()
  //   .ref(databasePrefix + roomcode + "/data")
  //   .update({
  //     _usercount: 0,
  //     _state: 1,
  //     _startgame: 0,
  //     _roomcode_reload: 0,
  //     _timerCurrent: 0,
  //     _moduleTimer: 0,
  //   });

  // var create_roomcode_ref = firebase.database().ref(databasePrefix + room_to_create + "/users");
  // create_roomcode_ref.once(
  //   "value",
  //   function (doc) {
  //     var create_roomcode_data = doc.val();
  //     // Success...
  //     document.getElementById("roomcode_input").value = room_to_create;
  //     if (create_roomcode_data == null) {
  //       isCreatingRoom = true;
  //       roomcode = create_roomcode_data;
  //       showTextForTime(response_text_obj, "Creating room '" + room_to_create + "'", 1200);
  //       setTimeout(() => {
  //         document.getElementById("joingame_btnid").click();
  //       }, 1000);
  //       createRoom(room_to_create);
  //     } else {
  //       showTextForTime(response_text_obj, "That Room Already Exists", 5000);
  //       return;
  //     }
  //   },
  //   (error) => {
  //     if (error) {
  //       console.log(error);
  //       showTextForTime(response_text_obj, error.toString().split(" ")[1], 2000);
  //     }
  //   }
  // );
}

//JOIN GAME BUTTON
export async function joinRoomFunction(roomCode) {
  if (isJoiningRoom) throw new Error("Already joining room");
  if (auth.currentUser == null) throw new Error("User not signed in");
  if (roomCode == "") throw new Error("Invalid room code");

  console.log("USER", auth.currentUser);

  //Get Room Data!
  room_data_ref = firebase.database().ref(databasePrefix + roomcode + "/data");
  room_data_ref.once(
    "value",
    function (doc) {
      room_data = doc.val();
      roomcode_data_data = doc.val();
      if (room_data != null) {
        isJoiningRoom = true;
        showTextForTime(response_text_obj, "Joining Room!", 1200);
        userscount_read = roomcode_data_data._usercount;
        newusercount = userscount_read + 1;
        usernum = newusercount;
        userPath = "user" + usernum;
        //Writes user info as roomcode/users/user[usernum]
        firebase
          .database()
          .ref(databasePrefix + roomcode + "/users/user" + usernum)
          .set({
            username: username,
            interactions: 0,
            wordsUnscrambled: 0,
            resetButtonClicks: 0,
            problemsSolved: 0,
          });
        //Adds one to the usercount
        firebase
          .database()
          .ref(databasePrefix + roomcode + "/data/")
          .update({
            _usercount: newusercount,
          });
        state = 1;
        createGameScreen();

        //Start the check to check if _startgame is updated!
        roomcode_data_startgame_ref = firebase
          .database()
          .ref(databasePrefix + roomcode + "/data/_startgame");
        roomcode_data_startgame_ref.on("value", function (snapshot) {
          if (state == 1) {
            startGameFunction();
          }
        });

        //Start the check to check if _state is updated!
        roomcode_data_startgame_ref = firebase
          .database()
          .ref(databasePrefix + roomcode + "/data/_state");
        roomcode_data_startgame_ref.on("value", function (snapshot) {
          recieveStateUpdate(snapshot.val());
        });

        //Start the check for _roomcode_reload = 1. If it is, quit the game
        roomcode_data_reload_ref = firebase
          .database()
          .ref(databasePrefix + roomcode + "/data/_roomcode_reload");
        roomcode_data_reload_ref.on("value", function (doc) {
          roomcodeReloadval = doc.val();
          if (roomcodeReloadval == "1" || roomcodeReloadval == 1) {
            onRoomcodeReload();
          }
        });

        //Start to check if Roomcode/users/_usercount is updated. If updated, call the playerlist_reload() function
        roomcode_users_usercount_ref = firebase
          .database()
          .ref(databasePrefix + roomcode + "/data/_usercount");
        roomcode_users_usercount_ref.on("value", function (snapshot) {
          if (state == 1) {
            playerlist_reload();
          }
        });
      } else {
        showTextForTime(response_text_obj, "Room does not exist", 1200);
        return;
      }
    },
    (error) => {
      if (error) {
        console.log(error);
        showTextForTime(response_text_obj, error.toString().split(" ")[1], 2000);
      }
    }
  );
}

// USER FUNCTIONS =========================================================
export function createAnonymousUser(username) {
  if (auth.currentUser != null) throw new Error("User already signed in.");

  console.log("attempting to create an anonymous account for user.");
  signInAnonymously(auth)
    .then(() => {
      // Signed in..
      console.log("Account created successfully!");
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      throw new Error(errorMessage);
    });
  updateUserDisplayName(username);
}

export function updateUserDisplayName(username) {
  if (username == "") throw new Error("No username");

  updateProfile(auth.currentUser, {
    displayName: username.toUpperCase(),
  })
    .then((data) => {
      console.log("Account updated successfully!");
      console.log(auth.currentUser);
      updateUserState(auth.currentUser);
    })
    .catch((error) => {
      throw new Error(error);
    });
}

export async function googlePopup() {
  const provider = new GoogleAuthProvider();
  window.sessionStorage.setItem("pending", 1);
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log(result);
      console.log(auth.currentUser);
      window.location.hash = "";
    })
    .catch((error) => {
      alert(error);
    });
}

export function deleteCurrentUser() {
  const user = auth.currentUser;
  console.log(user.providerId);

  deleteUser(user)
    .then(() => {
      // User deleted.
      alertManager.generateModalAlert({ header: "Your account is now deleted." });
      window.location.hash = "";
    })
    .catch((error) => {
      // An error ocurred
      alertManager.generateModalAlert({
        header: `An error occurred while deleting your account.`,
        bodyText: `${error.message}`,
      });
    });
}

export function signUserOut() {
  signOut(auth)
    .then(() => {
      console.log("signout!");
      changeRoute("home");
    })
    .catch((error) => {
      console.log("Error" + error);
    });
}

export function signUserIn(siEmail, siPassword) {
  signInWithEmailAndPassword(auth, siEmail, siPassword)
    .then((userCredential) => {
      // Signed in
      // console.log(userCredential);
      window.location.hash = "";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      $("#signIn-statusText").html(errorCode);
    });
}

export function signUserUp(displayName, email, password) {
  // console.log(`${firstName}, ${lastName}, ${email}, ${password}`);
  if (displayName.length > 30) return;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      updateProfile(auth.currentUser, {
        displayName: `${displayName}`,
      })
        .then(() => {
          $(".displayName").html(getUserDisplayName());
          updateUserState(auth.currentUser);
          // Profile updated!
          // ...
        })
        .catch((error) => {
          // An error occurred
          // ...
        });
      const user = userCredential.user;
      console.log(user, "userCreated");
      window.location.hash = "";
    })
    .catch((error) => {
      console.log(error);
      $("#signUp-statusText").html(error.message);
      console.error("Authentication error:", error.code, error.message);
    });
}

// HELPER FUNCTIONS =====================================================
function generateRandomLetters(length) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    result += alphabet.charAt(randomIndex);
  }
  return result;
}

export function checkRequired(id) {
  let allAreFilled = true;
  let reason = "valid";
  document
    .getElementById(id)
    .querySelectorAll("[required]")
    .forEach(function (i) {
      if (!allAreFilled) return;
      if (i.type === "radio") {
        let radioValueCheck = false;
        document
          .getElementById("myForm")
          .querySelectorAll(`[name=${i.name}]`)
          .forEach(function (r) {
            if (r.checked) radioValueCheck = true;
          });
        allAreFilled = radioValueCheck;
        if (!allAreFilled) reason = "Complete radio selection.";
        return;
      }
      if (i.type === "email" || i.id.toString().includes("email")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        allAreFilled = emailRegex.test(i.value);
        if (!allAreFilled) reason = "Please enter a valid email.";
      }
      if (!i.value) {
        console.log(i);

        allAreFilled = false;
        if (!allAreFilled) reason = "Please complete all required boxes.";
        return;
      }
    });
  return [allAreFilled, reason];
}
