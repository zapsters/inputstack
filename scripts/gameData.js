// Database & Input Object VARIABLES =========================================
var databasePrefix = "inputStack/";
var roomcode = "DEV";
var databaseObjects = [];
var inputObjects = [];

//List of all InputGroups that can be created.
var groupTypeList = [
  "module_simple_01",
  "module_reset_01",
  "module_unscramble_01",
  "module_math_01",
  "module_color_01",
];

//Debug Variables
var DEV_showGroupTitles = false;

//References
var healthDiv = document.getElementById("game_health_text");
var timer = document.getElementById("game_gameTimer_text");
var versionText = document.getElementById("versionDiv");

// Game Vars
var version = "1.3.0 Big Style Update!";
var host = false;
var defaultHealth = 100;
var health = defaultHealth;
var timerActive = false;
var totalSeconds = 0; //Used for in game realtime timer
var defaultTickSpeed = 1000;
var tickSpeed = defaultTickSpeed;
var username = "undefined";
var damageDisabled = false;
var roomcodeReload = false;

var groupReferences = []; //References to each group container.
var currentGroups = [];
var groupTypes = [];
var currentModuleNUM = 0;

var isCreatingRoom = false;
var isJoining = false;
var starting = false;
var state = 0; //State Value
//State 0: Not in a room
//State 1: In room, wait screen
//State 2: Beginning of game.
//State 3: GameOver screen
createGameScreen();

//Database User Path
var userPath = "null";

//GAME VARIABLES =============================================================
var moduleStartCount = 4;
var modules_per_spawnCycle = 2; // # of modules that spawn when the game_timeTillNextModule reaches 0
var game_timeTillNextModule_default = 40; //Seconds between each module spawn
var game_timeTillNextModule = game_timeTillNextModule_default;

//MODULE VARIABLES ===========================================================
//module_simple_01
var_simple01_healthPenalty = 1;

//module_reset_01
var reset_timer_graceTime = 3; //When to start flashing red.
var_reset_01_healthPenalty = 10;
var_reset_timerLength = 25;

//module_unscramble_01
unscramble_timer_graceTime = 10;
var_unscramble_healthPenalty = 10;
var_unscramble_timerLength = 100;

//module_math_01
var_math_01_timerLength = 60;
var_math_01_healthPenalty = 10;
math_01_timer_graceTime = 3;

math_problem_list = [
  ["8 * 3", "24"],
  ["260 - 48", "212"],
  ["184 + 73", "257"],
  ["93 - 21", "72"],
  ["92 + 3", "95"],
  ["250 * 4", "1000"],
  ["100 * 9", "900"],
  ["125 * 4", "500"],
  ["954 - 309", "645"],
  ["733 - 125", "608"],
  ["5^2", "25"],
  ["12 x 12", "144"],
];

//module_color_01
var_color_01_timerLength = 120;
var_color_01_healthPenalty = 10;
color_01_timer_graceTime = 3;
module_color_01_leniency = 50; //The leniency for a correct score. Each RGB channel must be this much close to the right answer (+ or -) for a correct.

// GAME INTERVALS ====================================================
var game_loop_interval = null; //Responsible for calling onTick() and gameplay_loop() every TickSpeed / Second.
var game_onTick_interval = null;
var game_timer_interval = null; //Does the timer during the game.

function toggleGameLoop(flag) {
  if (flag) {
    //Call GAMELOOP FUNCTION
    clearInterval(game_loop_interval);
    game_loop_interval = window.setInterval(function () {
      gameplay_loop();
    }, 1000);

    //Call ONTICK FUNCTIONS
    clearInterval(game_onTick_interval);
    game_onTick_interval = window.setInterval(function () {
      onTick();
    }, tickSpeed);
  } else {
    timerActive = false;
    clearInterval(game_loop_interval);
    clearInterval(game_onTick_interval);
    clearInterval(game_timer_interval);
  }
}

//Sets the speed of the game and it's timers.
function setTickSpeed(tickSpeed) {
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/MainVars/tickSpeed")
    .update({
      value: tickSpeed,
    });
}

//Runs every tick ============================
function onTick() {
  //HOST MANAGES THE GAME, REST IS FORMATTING.
  if (timerActive) ++totalSeconds;
  groupTypes.forEach(function (value, i) {
    var module_id = "module_" + i;
    switch (value) {
      case "module_simple_01":
        var slider01 = groupReferences[i].querySelector("#" + module_id + "_input_range_01");
        var slider02 = groupReferences[i].querySelector("#" + module_id + "_input_range_02");
        if (host) {
          if (slider01.value <= 0 && slider02.value > 0) {
            //console.log("TAKING DAMAGE!");
            takeDamage(var_simple01_healthPenalty);
          }
          if (slider02.value <= 0 && slider01.value > 0) {
            //console.log("TAKING DAMAGE!");
            takeDamage(var_simple01_healthPenalty);
          }
          if (slider02.value <= 0 && slider01.value <= 0) {
            //console.log("TAKING DAMAGE!");
            takeDamage(var_simple01_healthPenalty * 2);
          }

          slider01.value -= 2;
          userUpdateField(module_id + "_input_range_01");
          slider02.value -= 2;
          userUpdateField(module_id + "_input_range_02");
        }

        if (slider01.value <= 10 || slider02.value <= 10) {
          if (!groupReferences[i].classList.contains("flashing"))
            groupReferences[i].classList.add("flashing");
        } else {
          if (groupReferences[i].classList.contains("flashing"))
            groupReferences[i].classList.remove("flashing");
        }
        break;
      case "module_reset_01":
        module_timer_current = parseInt(
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML
        );
        //The host will tick down the timer of the module/group.
        if (host) {
          if (module_timer_current > 0) {
            module_timer_current--;
            groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML =
              module_timer_current;
            databaseTextObjects(module_id + "_timer", module_timer_current);
          } else {
            //console.log("TAKING DAMAGE!");
            takeDamage(var_reset_01_healthPenalty);
          }
        }
        //The module will flash red is low on time.
        if (module_timer_current > 0) {
          groupReferences[i].querySelector("#" + module_id + "_timer").style.color = "#000";
          if (module_timer_current <= reset_timer_graceTime) {
            if (!groupReferences[i].classList.contains("flashing"))
              groupReferences[i].classList.add("flashing");
          } else {
            if (groupReferences[i].classList.contains("flashing"))
              groupReferences[i].classList.remove("flashing");
          }
        } else {
          if (!groupReferences[i].classList.contains("flashing"))
            groupReferences[i].classList.add("flashing");
        }

        if (host) databaseTextObjects(module_id + "_timer", module_timer_current);
        break;
      case "module_unscramble_01":
        resultsText = groupReferences[i].querySelector("#" + module_id + "_results_text");
        module_timer_current = parseInt(
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML
        );

        //The host will tick down the timer of the module/group.
        if (host) {
          if (module_timer_current > 0) {
            module_timer_current--;
          } else {
            module_timer_current = var_unscramble_timerLength;

            if (resultsText.innerHTML != "CORRECT!") {
              //console.log("DEALING DAMAGE!");
              takeDamage(var_unscramble_healthPenalty);
              resultsText.innerHTML = "";
            } else {
              resultsText.innerHTML = "";
            }

            ScrambledtextOBJ = groupReferences[i].querySelector(
              "#" + module_id + "_scrambled_word_text"
            );
            UNScrambledtextOBJ = groupReferences[i].querySelector(
              "#" + module_id + "_UNscrambled_word_text"
            );
            inputfield = groupReferences[i].querySelector(
              "#" + module_id + "_input_unscrambledWord"
            );
            randomWORD =
              scrambled_words_list[Math.floor(Math.random() * scrambled_words_list.length)];

            writeToDatabase("modules/" + module_id + "/isCorrect", null, false);
            //Scrambledtext.innerHTML = randomWORD;
            databaseTextObjects(ScrambledtextOBJ.id, randomWORD.shuffle());
            databaseTextObjects(UNScrambledtextOBJ.id, randomWORD);
          }
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML =
            var_unscramble_timerLength;
          databaseTextObjects(module_id + "_timer", module_timer_current);
        }

        //The module will flash red is low on time.
        if (module_timer_current > 0) {
          if (
            module_timer_current <= unscramble_timer_graceTime &&
            resultsText.innerHTML != "CORRECT!"
          ) {
            if (!groupReferences[i].classList.contains("flashing"))
              groupReferences[i].classList.add("flashing");
          } else {
            if (groupReferences[i].classList.contains("flashing"))
              groupReferences[i].classList.remove("flashing");
          }
        } else {
          setTimeout(function () {
            if (groupReferences[i].classList.contains("flashing"))
              groupReferences[i].classList.remove("flashing");
          }, 1000);
          if (host != true) resultsText.innerHTML = "";
          inputfield = groupReferences[i].querySelector("#" + module_id + "_input_unscrambledWord");
          inputfield.value = "";
        }

        break;
      case "module_math_01":
        resultsText = groupReferences[i].querySelector("#" + module_id + "_results_text");
        module_timer_current = parseInt(
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML
        );
        //The host will tick down the timer of the module/group.

        if (host) {
          if (module_timer_current > 0) {
            module_timer_current--;
          } else {
            module_timer_current = var_math_01_timerLength;

            if (resultsText.innerHTML != "CORRECT!") {
              //console.log("DEALING DAMAGE!");
              takeDamage(var_math_01_healthPenalty);
              resultsText.innerHTML = "";
            } else {
              resultsText.innerHTML = "";
            }

            //GET A NEW PROBLEM
            randomPROBLEM = math_problem_list[Math.floor(Math.random() * math_problem_list.length)];
            math_question_text = groupReferences[i].querySelector(
              "#" + module_id + "_math_question_text"
            );
            math_answer_text = groupReferences[i].querySelector(
              "#" + module_id + "_math_answer_text"
            );

            writeToDatabase("modules/" + module_id + "/isCorrect", null, false);

            //SET THE QUESTION TEXT
            databaseTextObjects(math_question_text.id, randomPROBLEM[0]);
            //SET THE ANSWER TEXT
            databaseTextObjects(math_answer_text.id, randomPROBLEM[1]);
          }
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML =
            module_timer_current;
          databaseTextObjects(module_id + "_timer", module_timer_current);
        }
        //The module will flash red is low on time.
        if (module_timer_current > 0) {
          if (
            module_timer_current <= math_01_timer_graceTime &&
            resultsText.innerHTML != "CORRECT!"
          ) {
            if (!groupReferences[i].classList.contains("flashing"))
              groupReferences[i].classList.add("flashing");
          } else {
            if (groupReferences[i].classList.contains("flashing"))
              groupReferences[i].classList.remove("flashing");
          }
        } else {
          setTimeout(function () {
            if (groupReferences[i].classList.contains("flashing"))
              groupReferences[i].classList.remove("flashing");
          }, 1000);
          if (host != true) resultsText.innerHTML = "";
          inputfield = groupReferences[i].querySelector("#" + module_id + "_input_math_response");
          inputfield.value = "";
          inputfield.disabled = false;
        }

        break;
      case "module_color_01":
        var module_timer_current = parseInt(
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML
        );
        if (module_timer_current > 0) {
          if (host) module_timer_current--;
        } else {
          if (host) {
            module_timer_current = var_color_01_timerLength;
            var keyDiv = groupReferences[i].querySelector(
              "#" + module_id + "_module_colorSwatchKey"
            );
            var resultsText = groupReferences[i].querySelector("#" + module_id + "_results_text");
            if (resultsText.innerHTML != "CORRECT!") {
              takeDamage(var_color_01_healthPenalty);
            }
            resultsText.innerHTML = "";
            var newColor = randomColor().toString();
            keyDiv.style.backgroundColor = newColor;
            firebase
              .database()
              .ref(databasePrefix + roomcode + "/modules/" + module_id)
              .update({
                keyColor: newColor,
              });
          }

          //Unlock stuff when the module restarts
          var color01 = groupReferences[i].querySelector("#" + module_id + "_input_colorval_01");
          color02 = groupReferences[i].querySelector("#" + module_id + "_input_colorval_02");
          color03 = groupReferences[i].querySelector("#" + module_id + "_input_colorval_03");
          groupReferences[i].querySelector(
            "#" + module_id + "_input_submit_button"
          ).disabled = false;
          color01.disabled = false;
          color02.disabled = false;
          color03.disabled = false;
        }
        if (host) {
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML =
            module_timer_current;
          databaseTextObjects(module_id + "_timer", module_timer_current);
        }
        break;
      case "module_cardswipe_01":
        var module_timer_current = parseInt(
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML
        );
        if (module_timer_current > 0) {
          if (host) module_timer_current--;
        } else {
          if (host) {
            module_timer_current = var_color_01_timerLength;
            var keyDiv = groupReferences[i].querySelector(
              "#" + module_id + "_module_colorSwatchKey"
            );
            var resultsText = groupReferences[i].querySelector("#" + module_id + "_results_text");
            if (resultsText.innerHTML != "CORRECT!") {
              takeDamage(var_color_01_healthPenalty);
            }
            resultsText.innerHTML = "";
            var newColor = randomColor().toString();
            keyDiv.style.backgroundColor = newColor;
            firebase
              .database()
              .ref(databasePrefix + roomcode + "/modules/" + module_id)
              .update({
                keyColor: newColor,
              });
          }

          //Unlock stuff when the module restarts
          var color01 = groupReferences[i].querySelector("#" + module_id + "_input_colorval_01");
          color02 = groupReferences[i].querySelector("#" + module_id + "_input_colorval_02");
          color03 = groupReferences[i].querySelector("#" + module_id + "_input_colorval_03");
          groupReferences[i].querySelector(
            "#" + module_id + "_input_submit_button"
          ).disabled = false;
          color01.disabled = false;
          color02.disabled = false;
          color03.disabled = false;
        }
        if (host) {
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML =
            module_timer_current;
          databaseTextObjects(module_id + "_timer", module_timer_current);
        }
        break;
      default:
        console.log(value + " failed in the ONTICK function.");
        break;
    }

    if (host) {
      firebase
        .database()
        .ref(databasePrefix + roomcode + "/data")
        .update({
          _timerCurrent: totalSeconds,
          _moduleTimer: game_timeTillNextModule,
        });
    }
    //console.log(module_id + " is type " + value);
  });
}

// POPUP DIVs (for example the wordbank) ======================================================
var currentActiveDiv = null;
function openDiv(divname) {
  currentActiveDiv = document.getElementById(divname);
  if (currentActiveDiv) {
    grayOutDivScreen.style.display = "block";
    currentActiveDiv.style.display = "block";
  } else {
    console.error("DIV ID '" + divname + "' DOES NOT EXIST!");
  }
}

function closeDiv() {
  grayOutDivScreen.style.display = "none";
  currentActiveDiv.style.display = "none";
  currentActiveDiv = null;
}

//Debug STUFF ============================================================
debug_vars = [
  "state",
  "roomcode",
  "host",
  "username",
  "userscount_read",
  "usersArray",
  "isJoining",
  "starting",
  "timerActive",
  "DEV_showGroupTitles",
];
var debug_menu = document.getElementById("debug_menu_div");
var debug_menu_text = document.getElementById("debug_menu_text");
var debug_menu_open = false;
if (debug_menu.style.display != "none") debug_menu_open = true;
function toggleDebugMenu() {
  if (debug_menu_open) {
    debug_menu_open = false;
    debug_menu.style.display = "none";
    extraDEBUG.style.display = "none";
    //DEV_showGroupTitles = false;
  } else if (!debug_menu_open) {
    debug_menu_open = true;
    debug_menu.style.display = "block";
    extraDEBUG.style.display = "block";
    //DEV_showGroupTitles = true;
  }
}

//Called every second. Updates Debug div.
function updateDebug() {
  //Debug Text
  debug_text = [];
  //debug_vars
  for (i = 0; i < debug_vars.length; i++) {
    debug_text[i] = debug_vars[i] + ": " + window[debug_vars[i]];
  }
  debug_menu_text.innerHTML = debug_text.join("<br>");
}
setInterval(updateDebug, 100);

//KEY PRESS CHECK (For dev mode and such)
document.body.addEventListener("keydown", keyDownTextField, false);
function keyDownTextField(e) {
  var keyCode = e.which;
  if (keyCode == 46) {
    //Open debug with delete
    toggleDebugMenu();
    if (state == 0) {
      if (username_input.value == "") username_input.value = "Erin <3";
      createroomFunction(true);
    }
  }
}

function createText(string) {
  var div = document.createElement("div");
  div.classList.add("textDivObject");
  div.innerHTML = string;
  document.getElementById("textLayer").appendChild(div);
}

// LOBBY LOGIC ===============================================================================================
// Create Lobby Logic
function createroomFunction(dev) {
  if (isCreatingRoom) return;
  username = document.getElementById("username_input").value;
  response_text_obj = document.getElementById("subtext_joingame");
  //Check if username and roomcode are filled out
  if (username == "") {
    showTextForTime(response_text_obj, "ENTER A USERNAME", 1200);
    return;
  }

  var room_to_create = Math.random().toString(20).substr(2, 6);
  if (dev) room_to_create = "dev";
  create_roomcode_ref = firebase.database().ref(databasePrefix + room_to_create + "/users");
  create_roomcode_ref.once(
    "value",
    function (doc) {
      create_roomcode_data = doc.val();
      // Success...
      document.getElementById("roomcode_input").value = room_to_create;
      if (create_roomcode_data == null) {
        isCreatingRoom = true;
        roomcode = create_roomcode_data;
        showTextForTime(response_text_obj, "Creating room '" + room_to_create + "'", 1200);
        setTimeout(() => {
          document.getElementById("joingame_btnid").click();
        }, 1000);
        createRoom(room_to_create);
      } else {
        showTextForTime(response_text_obj, "That Room Already Exists", 5000);
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

//Create room data in the database.
function createRoom(roomcode) {
  console.log("CREATING ROOM!");
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/users")
    .set({});
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/data")
    .update({
      _usercount: 0,
      _state: 1,
      _startgame: 0,
      _roomcode_reload: 0,
      _timerCurrent: 0,
      _moduleTimer: 0,
    });
}

//JOIN GAME BUTTON
function joinroomFunction() {
  if (isJoining) return;
  username = document.getElementById("username_input").value;
  roomcode = document.getElementById("roomcode_input").value.toLowerCase();
  response_text_obj = document.getElementById("subtext_joingame");
  //Check if username and roomcode are filled out
  if (username == "") {
    showTextForTime(response_text_obj, "ENTER A USERNAME", 1200);
    return;
  }
  if (roomcode == "") {
    showTextForTime(response_text_obj, "ENTER A ROOMCODE", 1200);
    return;
  }

  //Get Room Data!
  room_data_ref = firebase.database().ref(databasePrefix + roomcode + "/data");
  room_data_ref.once(
    "value",
    function (doc) {
      room_data = doc.val();
      roomcode_data_data = doc.val();
      if (room_data != null) {
        isJoining = true;
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

//Called by all players when _roomcode_reload == 1. Reloads page when the host leaves.
function onRoomcodeReload() {
  if (roomcodeReload) return;
  roomcodeReload = true;
  if (host) {
    deleteRoom(roomcode);
  } else {
    alert("Host left the game... Leaving Room.");
  }
  location.reload();
}
/* CHECK IF WINDOW IS CLOSED... If host, tell database you left and to delete the room*/
window.onbeforeunload = function () {
  if (host) {
    abandonRoom();
  }
};

function abandonRoom() {
  if (host) {
    firebase
      .database()
      .ref(databasePrefix + roomcode + "/data")
      .update({
        _roomcode_reload: 1,
      });
    deleteRoom(roomcode);
  }
}

//Delete Room in database
function deleteRoom(roomcode) {
  firebase
    .database()
    .ref(databasePrefix + roomcode)
    .set({});
}

//Called whenever a player joins the room (INCLUDING SELF)
function playerlist_reload() {
  if (state == 1) {
    document.getElementById("playerlist_li").innerHTML = "";
    roomcode_users_ref = firebase.database().ref(databasePrefix + roomcode + "/data");
    roomcode_users_ref.once("value", function (doc) {
      if (state == 1) {
        roomcode_users_data = doc.val();
        userscount_read = roomcode_users_data._usercount;
        //If the current user is the first user in the room, give them the start button and make vip=1
        if (userscount_read == 1) {
          document.getElementById("startbtn").style.display = "inline-block";
          host = true;

          updateFooter();
        }
        usersArray = [];
        for (i = 1; i <= userscount_read; i++) {
          roomcode_users_user_ref = firebase
            .database()
            .ref(databasePrefix + roomcode + "/users/user" + i);
          roomcode_users_user_ref.once("value", function (doc) {
            roomcode_users_user_data = doc.val();
            roomcode_users_user_username_data = roomcode_users_user_data.username;
            usersArray.push(roomcode_users_user_username_data);
            //Create a div with the player's name inside of it
            var node = document.createElement("div");
            var divText = document.createElement("p");
            divText.innerHTML = roomcode_users_user_username_data;
            var playerUsername = roomcode_users_user_username_data.toString().toLowerCase();
            if (playerUsername.includes("erin") || playerUsername.includes("kat")) {
              node.classList.add("trans");
            }
            node.appendChild(divText);
            document.getElementById("playerlist_li").appendChild(node);
          });
        }
      }
    });
  }
}

// START GAME LOGIC ====================================================================================
function startGame() {
  game_timeTillNextModule = game_timeTillNextModule_default;
  //Begin the game with default # of modules. (4?)
  setTimeout(function () {
    initializeModuleMultiple(moduleStartCount);
    firebase
      .database()
      .ref(databasePrefix + roomcode + "/data")
      .update({
        _state: state,
      });
  }, 150);

  //Begin gameplay functions
  toggleGameLoop(true);
}

//startGameFunction
//This is called when joining a room and subscribes to the _startgame variable in the database.
function startGameFunction() {
  if (state == 1 && starting == 0) {
    roomcode_data_startgame_ref = firebase.database().ref(databasePrefix + roomcode + "/data");
    roomcode_data_startgame_ref.on("value", function (doc) {
      roomcode_data_startgame_data = doc.val();
      roomcode_data_startgame_value = roomcode_data_startgame_data._startgame;
      if (roomcode_data_startgame_value == 1 && starting == 0 && state == 1) {
        starting = 1;
        document.getElementById("subtext2_players").innerHTML = "STARTING IN<br>3...";
        setTimeout(function () {
          document.getElementById("subtext2_players").innerHTML = "STARTING IN<br>2...";
          setTimeout(function () {
            document.getElementById("subtext2_players").innerHTML = "STARTING IN<br>1...";
            setTimeout(function () {
              document.getElementById("subtext2_players").innerHTML = "STARTING!<br>";
              setTimeout(function () {
                document.getElementById("playerlist_div").style.display = "none";
                setTimeout(function () {
                  //Ran by everyone to start the game on their end.
                  console.log("STARTING GAME!");
                  if (host) databaseSetState(2);
                  //state = 2;
                  //createGameScreen();
                  //initializeGame();
                  if (host == true) {
                    startGame();
                  }
                }, 1000);
              }, 1000);
            }, 1000);
          }, 1000);
        }, 1000);
      }
    });
  }
}

function updateFooter() {
  if (state <= 1) {
    document.getElementById("footer_username").innerHTML = "Logged in as: " + username;
    document.getElementById("footer_roomcode").innerHTML = "Roomcode: " + roomcode;
    document.getElementById("footer_username").style.display = "block";
    document.getElementById("footer_roomcode").style.display = "block";
    if (host) document.getElementById("footer_host").style.display = "block";
    document.getElementById("footer_credit").style.display = "none";
  } else {
    document.getElementById("footer_credit").style.display = "block";
  }
}

// GAME PLAY LOOPS =====================================================
//Called every tickSpeed, deals with Module Spawning.
function gameplay_loop() {
  if (state != 2 || !host) {
    return;
  }

  if (health == 0) {
    //gameOver();
    databaseSetState(3);
  }

  if (game_timeTillNextModule == 0) {
    initializeModuleMultiple(modules_per_spawnCycle);
    game_timeTillNextModule = game_timeTillNextModule_default;
  } else {
    if (game_timeTillNextModule == null) {
      game_timeTillNextModule = game_timeTillNextModule_default;
    } else {
      game_timeTillNextModule--;
    }
  }
}

//Update Header and Timer Text
function updateHeader() {
  game_moduleCount_text.innerHTML = "Modules: " + currentModuleNUM;
  game_gameTimer_text.innerHTML = timerText;
  game_timeTillNextModule_text.innerHTML = "Time till next module: " + game_timeTillNextModule;
}

function gameOver() {
  toggleGameLoop(false);
  timerActive = false;
  initializeGameOverScreen();
}

//Health logic
//HOST - takeDamageFunction Can take negative damage to heal.
function takeDamage(amount) {
  if (host && !damageDisabled) {
    if (health - amount <= 0) {
      newHealth = 0;
    } else {
      newHealth = health - amount;
    }

    firebase
      .database()
      .ref(databasePrefix + roomcode + "/MainVars/health")
      .update({
        value: newHealth,
      });
  }
}

const headerColor = document.getElementById("header").style.backgroundColor;

//Used to animate the header's backgroundColor indicating damage
function healthChangeAnimation(healthChange, newHealth) {
  var headerDIV = document.getElementById("header");
  if (healthChange <= 0) {
    //If taking damage
    flashColor = "#fc3030";
  } else {
    //If Healed
    flashColor = "#42d4ad";
  }

  if (newHealth == 0) {
    let damageHeaderAnimation = document
      .getElementById("header")
      .animate([{ backgroundColor: flashColor }], {
        fill: "forwards",
        duration: 70,
        iterationStart: 0,
        playbackRate: 0,
      });
  } else {
    let damageHeaderAnimation = document
      .getElementById("header")
      .animate([{ backgroundColor: flashColor }, { backgroundColor: headerColor }], {
        fill: "forwards",
        easing: "steps(20, end)",
        duration: 800,
        iterationStart: 0,
        playbackRate: 0,
      });
  }
}

// DATABASE / INPUT SYNC LOGIC! ========================================================
function databaseSetState(val) {
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/data")
    .update({
      _state: val,
    });
}

function recieveStateUpdate(value) {
  state = value;
  createGameScreen();
  switch (value) {
    case 2:
      initializeGame();
      break;
    case 3:
      gameOver();
      break;
  }
}

var oldSnapshot = {};
var newSnapshot = {};
var changedObjects = {};
// Used At the start of gameplay to start checking for database updates.
// Includes recieving field updates, then setting the new value on screen.
function initializeGame() {
  initInput("input_textbox_01");
  initInput("input_checkbox_01");

  timerActive = true;

  //Call ONTICK FUNCTIONS
  clearInterval(game_onTick_interval);
  game_onTick_interval = window.setInterval(function () {
    onTick();
  }, tickSpeed);

  databaseModuleChecking();

  //Check for when a field is updated! ==============================================================================================
  //Update 1.00: Now we check oldSnapshot vs newSnapshot, and only run code for the objects that have a new value.
  /* The above code is listening for changes in a Firebase database reference. When a change occurs, it
  retrieves the updated data and updates the corresponding input fields in the HTML document. It
  also performs additional actions based on the `dataset.onupdate` value of each input field.
  Finally, it prints the updated object list to a specific div in the HTML document. */
  database_objects_instances_ref = firebase.database().ref(databasePrefix + roomcode + "/objects/");
  database_objects_instances_ref.on("value", function (doc) {
    inputData = doc.val();
    //Get each input field in the database folder
    try {
      inputObjectList = Object.keys(doc.val());
    } catch (err) {
      inputObjectList = [];
    }
    if (typeof inputObjectList == undefined) {
      //If no data...
      inputObjectList = [];
      //Update current groups DIV.
      DEVobjectList = document.getElementById("DATABASE_OBJECTS");
      DEVobjectList.innerHTML = "Updated: " + dateTime(1) + "<br>";
    } else {
      //This prevents it breaking when starting a new game.
      //Or else it would break the newSnapshot/oldSnapshot logic.
      if (doc.val() == null) {
        return;
      }
      newSnapshot = doc.val();
      changedObjects = JSONdiff(oldSnapshot, newSnapshot);
      oldSnapshot = doc.val();
      changedInputObjectList = Object.keys(changedObjects);
      //console.log(changedObjects);

      //Print the object list to the DEV div.
      DEVobjectList = document.getElementById("DATABASE_OBJECTS");
      DEVobjectList.innerHTML = "Updated: " + dateTime(1) + "<br>";

      //Get the element for each entry in the 'objects/' folder.
      changedInputObjectList.forEach((objectID) => {
        if (!databaseObjects.includes(objectID)) databaseObjects.push(objectID);
        if (document.getElementById(objectID)) {
          inputObject = document.getElementById(objectID); //Get the coresponding input field.

          databaseInputValue = doc.child(objectID).child("value").val();

          switch (inputObject.type) {
            case "checkbox":
              inputObject.checked = databaseInputValue;
              break;
            default:
              inputObject.value = databaseInputValue;
              break;
          }

          //Used to run code if a field gets updated.
          if (inputObject.dataset.onupdate != undefined) {
            var onRunData = inputObject.dataset.onupdate;
            var groupInDatabase = inputObject.dataset.groupInDatabase;
            var moduleId = inputObject.dataset.moduleId;
            switch (onRunData) {
              case "updateColorResult":
                updateColorResult(moduleId, groupInDatabase);
                break;
              case "cardswipeSpeedCalc":
                cardswipeSpeedCalc(moduleId, groupInDatabase);
                break;
              default:
                break;
            }
          }

          //Add object to array, then update list
          DEVobjectList = document.getElementById("DATABASE_OBJECTS");
          DEVobjectList.innerHTML += objectID + " = " + databaseInputValue + "<br>";
        } else {
          alert(objectID + " doesn't exist.");
        }
      });
    }
    DEVobjectList.innerHTML += "<br>" + databaseObjects.join(" | ");
  });

  //Check for when the MainVars folder is updated in the database. ==================
  /* The above code is listening for changes in the "MainVars" section of a Firebase database. When a
  change occurs, it retrieves the updated values and performs different actions based on the
  variable name. */
  database_important_vars_ref = firebase.database().ref(databasePrefix + roomcode + "/MainVars/");
  database_important_vars_ref.on("value", function (doc) {
    inputData = doc.val();
    if (inputData == null) return;
    varList = Object.keys(doc.val());
    varList.forEach((variable, i) => {
      switch (variable) {
        case "health":
          newHealth = doc.child(variable).child("value").val();
          healthChangeAnimation(newHealth - health, newHealth); //Updates the look of the header.
          health = newHealth;
          healthDiv.innerHTML = "HEALTH: " + health;
          break;
        case "tickSpeed":
          tickSpeed = doc.child(variable).child("value").val();
          toggleGameLoop(true); //Update the gameplayLoop for new tickspeed.
          break;
        default:
          createText("UNKOWN IMPORTANT VARIABLE IN DATABASE - " + variable);
          break;
      }
    });
  });

  //Check for when the textObject folder is updated in the database. ==================
  database_gamevar_instances_ref = firebase
    .database()
    .ref(databasePrefix + roomcode + "/textObjects/");
  database_gamevar_instances_ref.on("value", function (doc) {
    inputData = doc.val();
    if (inputData == null) return;
    groupList = Object.keys(doc.val()); //WILL THROW ERROR IF NO DATA IN DATABASE.
    groupList.forEach((textObjectInDatabase) => {
      textObjectData = doc.child(textObjectInDatabase).child("data").val();
      document.getElementById(textObjectInDatabase).innerHTML = textObjectData;
    });
  });

  // Check for data updates.
  // Update timer text
  database_data_instances_ref = firebase.database().ref(databasePrefix + roomcode + "/data/");
  database_data_instances_ref.on("value", function (doc) {
    gameData = doc.val();
    //Timer
    totalSeconds = gameData._timerCurrent;
    secondsText = pad(totalSeconds % 60);
    minutesText = pad(parseInt(totalSeconds / 60));
    timerText = minutesText + ":" + secondsText;

    //Module timer
    game_timeTillNextModule = gameData._moduleTimer;
    updateHeader();
  });
}
//END OF INITGAME=====

//Called whenever the user manually updates a field. It communicates to the database to update the field to the new value. Data is saved used the inputField's id.
function userUpdateField(fieldID) {
  var fieldID_OBJ = document.getElementById(fieldID);
  switch (fieldID_OBJ.type) {
    case "checkbox":
      firebase
        .database()
        .ref(databasePrefix + roomcode + "/objects/" + fieldID)
        .update({
          value: fieldID_OBJ.checked,
        });
      break;
    default:
      firebase
        .database()
        .ref(databasePrefix + roomcode + "/objects/" + fieldID)
        .update({
          value: fieldID_OBJ.value,
        });
      break;
  }
}

//This takes the input object and adds eventlisteners to sync it with the database.
//Allows the user's changes to call "userUpdateField()" to update database value.
function initInput(fieldID) {
  if (document.getElementById(fieldID)) {
    fieldOBJ = document.getElementById(fieldID);

    switch (fieldOBJ.type) {
      case "checkbox":
        fieldOBJ.addEventListener("change", function () {
          userUpdateField(fieldID);
        });
        break;
      default:
        fieldOBJ.addEventListener("input", function () {
          userUpdateField(fieldID);
        });
        break;
    }

    //Add object to array, then update list
    inputObjects.push(fieldID);
    InputObjectsList = document.getElementById("INPUT_OBJECTS");
    InputObjectsList.innerHTML = "UserInputObjects = " + inputObjects.join(" | ");
    //userUpdateField(fieldID);
  } else {
    alert("Problem initInput for " + fieldID + " (Doesn't Exist?)");
  }
}

function databaseModuleChecking() {
  //CHECKS AND CREATES ANY MODULES IN THE GROUPS FOLDER!!! ===================================
  //Check for when the group folder is updated in the database. ==================
  database_groups_instances_ref = firebase.database().ref(databasePrefix + roomcode + "/modules/");
  database_groups_instances_ref.on("value", function (doc) {
    inputData = doc.val();

    //Get each group folder in the database's /modules/
    try {
      groupList = Object.keys(doc.val());
    } catch (err) {
      //WILL THROW ERROR IF NO DATA IN DATABASE.
      groupList = undefined;
    }
    if (groupList === undefined) {
      //If no data in the groups folder, delete all current group.
      createText("# NO GROUP DATA! Deleting all groups.");
      groupList = [];
      currentGroups = [];
      groupTypes = [];
      currentModuleNUM = 0;
      //Update current groups DIV.
      CURRENT_GROUPSDIV = document.getElementById("CURRENT_GROUPSDIV");
      CURRENT_GROUPSDIV.innerHTML = "CurrentGroups = " + currentGroups.join(" | ");
      groupReferences.forEach((groupReference) => {
        groupReference.remove();
      });
      removeDeletedInputFields();
      groupReferences = [];
    } else {
      //Update the currentModuleNUM
      currentModuleNUM = groupList.length;
      updateHeader();

      //For every module_## in the database...
      groupList.forEach((groupInDatabase) => {
        if (!currentGroups.includes(groupInDatabase)) {
          currentGroups.push(groupInDatabase);
          //Check if the group already exists, if not...
          groupType = doc.child(groupInDatabase).child("groupType").val();
          createText(
            "# CREATE THE GROUP! TYPE of '<i>" + groupType + "</i>' as " + groupInDatabase
          );

          //CREATING A NEW DIV FROM TEMPLATE
          var templateGroup = document.getElementById("TEMPLATE_" + groupType);
          var createdGroup = templateGroup.cloneNode(true);
          createdGroup.id = "MODULE_ENTRY_" + groupInDatabase;
          createdGroup.querySelector("#" + templateGroup.id + "_DEVtitle").innerHTML =
            createdGroup.id;
          if (!DEV_showGroupTitles) {
            createdGroup.querySelector("#" + templateGroup.id + "_DEVtitle").style.display = "none";
          }
          document.getElementById("moduleContainer").appendChild(createdGroup);
          var children = createdGroup.getElementsByTagName("*");
          //Give new id to children
          for (let i = 0; i < children.length; i++) {
            children[i].id = groupInDatabase + "_" + children[i].dataset.id;
          }

          //Init input children and set moduleObject data onto input children.
          var inputChildren = createdGroup.getElementsByTagName("input");
          for (let i = 0; i < inputChildren.length; i++) {
            initInput(inputChildren[i].id);
            inputChildren[i].dataset.moduleId = createdGroup.id;
            inputChildren[i].dataset.groupInDatabase = groupInDatabase;
          }

          fullyInitGroup(createdGroup, groupInDatabase, groupType);

          groupReferences.push(createdGroup);
          groupTypes.push(groupType);
        }
      });
    }

    //Update current groups DIV.
    CURRENT_GROUPSDIV = document.getElementById("CURRENT_GROUPSDIV");
    CURRENT_GROUPSDIV.innerHTML = "CurrentGroups = " + currentGroups.join(" | ");
  });
}

//Inputs come in groups. This will spawn a group of inputs.
//This will create a new folder in the database with the needed input fields.
function initializeModule(groupType) {
  if (host == false) {
    createText("<b>YOU ARE NOT THE HOST... WHY INITIZALIZEINPUTGROUP()???</b>");
  }
  if (groupType == undefined) {
    //var groupTypeList = ["module_simple_01", "module_reset_01"];
    var groupType = groupTypeList[Math.floor(Math.random() * groupTypeList.length)];
  }
  var groupID = currentModuleNUM;
  createText("<br>[] initializeModule(" + groupType + ") " + "as module_" + groupID + " | ");
  switch (groupType) {
    case "module_color_01":
      firebase
        .database()
        .ref(databasePrefix + roomcode + "/modules/" + "module_" + groupID)
        .update({
          groupType: groupType,
          keyColor: "rgb(255,255,255)",
        });
      break;

    default:
      firebase
        .database()
        .ref(databasePrefix + roomcode + "/modules/" + "module_" + groupID)
        .update({
          groupType: groupType,
        });
      break;
  }
}

function initializeModuleMultiple(count) {
  for (i = 0; i < count; i++) {
    initializeModule();
  }
}

//add functions to buttons and such.
function fullyInitGroup(createdGroupRef, module_id, groupType) {
  switch (groupType) {
    case "module_simple_01":
      var range1 = createdGroupRef.querySelector("#" + module_id + "_input_range_01");
      var range2 = createdGroupRef.querySelector("#" + module_id + "_input_range_02");
      range1.addEventListener("click", function () {
        interactions++;
        updateUserStats();
      });
      range2.addEventListener("click", function () {
        interactions++;
        updateUserStats();
      });
      break;
    case "module_reset_01":
      var ResetButton = createdGroupRef.querySelector("#" + module_id + "_input_reset_button");
      ResetButton.addEventListener("click", function () {
        createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML = var_reset_timerLength;
        databaseTextObjects(module_id + "_timer", var_reset_timerLength);
        if (createdGroupRef.classList.contains("flashing"))
          createdGroupRef.classList.remove("flashing");
        resetButtonClicks += 1;
        interactions += 1;
        updateUserStats();
      });
      var module_timer_current = var_reset_timerLength;
      createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML = var_reset_timerLength;
      break;
    case "module_unscramble_01":
      var ScrambledtextOBJ = createdGroupRef.querySelector(
        "#" + module_id + "_scrambled_word_text"
      );
      var UNScrambledtextOBJ = createdGroupRef.querySelector(
        "#" + module_id + "_UNscrambled_word_text"
      );
      var resultsText = createdGroupRef.querySelector("#" + module_id + "_results_text");
      var inputfield = createdGroupRef.querySelector("#" + module_id + "_input_unscrambledWord");
      var submitButton = createdGroupRef.querySelector("#" + module_id + "_input_submit_button");

      var module_timer_current = var_unscramble_timerLength;
      createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML =
        var_unscramble_timerLength;

      //Add event listener for the "isCorrect" var in the database
      var unscrambleIsCorrectEvent = firebase
        .database()
        .ref(databasePrefix + roomcode + "/modules/" + module_id + "/isCorrect");
      unscrambleIsCorrectEvent.on("value", function (doc) {
        var resultsText = createdGroupRef.querySelector("#" + module_id + "_results_text");
        var inputfield = createdGroupRef.querySelector("#" + module_id + "_input_unscrambledWord");

        var isCorrect = doc.child("data").val();
        if (isCorrect == true) {
          inputfield.disabled = true;
          submitButton.disabled = true;
          resultsText.innerHTML = "CORRECT!";
          resultsText.style.color = "green";
        } else if (isCorrect == false) {
          resultsText.innerHTML = "WRONG!";
          setTimeout(function () {
            if (resultsText.innerHTML == "CORRECT!") return;
            resultsText = createdGroupRef.querySelector("#" + module_id + "_results_text");
            resultsText.innerHTML = "";
            inputfield.disabled = false;
          }, 1000);
          resultsText.style.color = "#b50000";
          inputfield.disabled = false;
          submitButton.disabled = false;
        } else if (isCorrect == undefined) {
          inputfield.disabled = false;
          submitButton.disabled = false;
        }
      });

      if (host) {
        //GET A NEW TEXT
        var randomWORD =
          scrambled_words_list[Math.floor(Math.random() * scrambled_words_list.length)];
        //Scrambledtext.innerHTML = randomWORD;
        databaseTextObjects(ScrambledtextOBJ.id, randomWORD.shuffle());
        databaseTextObjects(UNScrambledtextOBJ.id, randomWORD);
      }

      //BUTTON
      submitButton.addEventListener("click", function () {
        var inputfield = createdGroupRef.querySelector("#" + module_id + "_input_unscrambledWord");
        if (inputfield.value == "") return;
        var UNScrambledtextOBJ = createdGroupRef.querySelector(
          "#" + module_id + "_UNscrambled_word_text"
        );
        if (inputfield.value.toLowerCase() == UNScrambledtextOBJ.innerHTML.toLowerCase()) {
          writeToDatabase("modules/" + module_id + "/isCorrect", true, false);
          if (createdGroupRef.classList.contains("flashing"))
            createdGroupRef.classList.remove("flashing");
          wordsUnscrambled += 1;
          interactions += 1;
          updateUserStats();
        } else {
          writeToDatabase("modules/" + module_id + "/isCorrect", false, true);
        }
        inputfield.value = "";
        userUpdateField(inputfield.id);
      });

      //WHEN PRESSING ENTER IN INPUT FIELD
      inputfield.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          var submitButton = createdGroupRef.querySelector(
            "#" + module_id + "_input_submit_button"
          );
          submitButton.click();
        }
      });
      break;
    case "module_math_01":
      //TEXT OBJECT CODE
      var math_question_text = createdGroupRef.querySelector(
        "#" + module_id + "_math_question_text"
      );
      var math_answer_text = createdGroupRef.querySelector("#" + module_id + "_math_answer_text");
      var resultsText = createdGroupRef.querySelector("#" + module_id + "_results_text");
      var inputfield = createdGroupRef.querySelector("#" + module_id + "_input_math_response");
      var submitButton = createdGroupRef.querySelector("#" + module_id + "_input_submit_button");

      var module_timer_current = var_math_01_timerLength;
      createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML = module_timer_current;

      //Add event listener for the "isCorrect" var in the database
      var mathIsCorrectEvent = firebase
        .database()
        .ref(databasePrefix + roomcode + "/modules/" + module_id + "/isCorrect");
      mathIsCorrectEvent.on("value", function (doc) {
        var resultsText = createdGroupRef.querySelector("#" + module_id + "_results_text");
        var inputfield = createdGroupRef.querySelector("#" + module_id + "_input_math_response");

        var isCorrect = doc.child("data").val();
        if (isCorrect == true) {
          inputfield.disabled = true;
          submitButton.disabled = true;
          resultsText.innerHTML = "CORRECT!";
          resultsText.style.color = "green";
        } else if (isCorrect == false) {
          resultsText.innerHTML = "WRONG!";
          inputfield.disabled = false;
          submitButton.diabled = false;
          setTimeout(function () {
            if (resultsText.innerHTML == "CORRECT!") return;
            resultsText.style.color = "#b50000";
            resultsText.innerHTML = "";
          }, 1000);
          inputfield.disabled = false;
          submitButton.disabled = false;
        } else if (isCorrect == undefined) {
          submitButton.disabled = false;
          inputfield.disabled = false;
        }
      });

      if (host) {
        //GET A NEW PROBLEM
        var randomPROBLEM = math_problem_list[Math.floor(Math.random() * math_problem_list.length)];

        //SET THE QUESTION TEXT
        databaseTextObjects(math_question_text.id, randomPROBLEM[0]);
        //SET THE ANSWER TEXT
        databaseTextObjects(math_answer_text.id, randomPROBLEM[1]);
      }

      //BUTTON
      submitButton.addEventListener("click", function () {
        var inputfield = createdGroupRef.querySelector("#" + module_id + "_input_math_response");
        if (inputfield.value == "") return;
        var math_answer_text = createdGroupRef.querySelector("#" + module_id + "_math_answer_text");
        if (inputfield.value.toLowerCase() == math_answer_text.innerHTML.toLowerCase()) {
          writeToDatabase("modules/" + module_id + "/isCorrect", true, false);
          if (createdGroupRef.classList.contains("flashing"))
            createdGroupRef.classList.remove("flashing");
          problemsSolved += 1;
          interactions += 1;
          updateUserStats();
        } else {
          writeToDatabase("modules/" + module_id + "/isCorrect", false, true);
        }
        inputfield.value = "";
        userUpdateField(inputfield.id);
      });

      //WHEN PRESSING ENTER IN INPUT FIELD
      inputfield.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          var submitButton = createdGroupRef.querySelector(
            "#" + module_id + "_input_submit_button"
          );
          submitButton.click();
        }
      });

      break;
    case "module_color_01":
      //Timer
      var module_timer_current = var_color_01_timerLength;
      createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML = module_timer_current;

      var submitButton = createdGroupRef.querySelector("#" + module_id + "_input_submit_button");
      var userColorDiv = createdGroupRef.querySelector(
        "#" + module_id + "_module_colorSwatch_result"
      );
      var colorVal1 = createdGroupRef.querySelector("#" + module_id + "_input_colorval_01");
      var colorVal2 = createdGroupRef.querySelector("#" + module_id + "_input_colorval_02");
      var colorVal3 = createdGroupRef.querySelector("#" + module_id + "_input_colorval_03");
      var keyDiv = createdGroupRef.querySelector("#" + module_id + "_module_colorSwatchKey");

      //Add event listener for the "isCorrect" var in the database
      var colorIsCorrectEvent = firebase
        .database()
        .ref(databasePrefix + roomcode + "/modules/" + module_id + "/isCorrect");
      colorIsCorrectEvent.on("value", function (doc) {
        var resultsText = createdGroupRef.querySelector("#" + module_id + "_results_text");

        var isCorrect = doc.child("data").val();
        if (isCorrect == true) {
          resultsText.innerHTML = "CORRECT!";
          resultsText.style.color = "green";
          colorVal1.disabled = true;
          colorVal2.disabled = true;
          colorVal3.disabled = true;
          submitButton.disabled = true;
        } else if (isCorrect == false) {
          resultsText.innerHTML = "WRONG!";
          colorVal1.disabled = false;
          colorVal2.disabled = false;
          colorVal3.disabled = false;
          submitButton.disabled = false;
          setTimeout(function () {
            if (
              createdGroupRef.querySelector("#" + module_id + "_results_text").innerHTML ==
              "CORRECT!"
            )
              return;
            var resultsText = createdGroupRef.querySelector("#" + module_id + "_results_text");
            resultsText.innerHTML = "";
          }, 1000);
          resultsText.style.color = "#b50000";
        } else {
          colorVal1.disabled = false;
          colorVal2.disabled = false;
          colorVal3.disabled = false;
          submitButton.disabled = false;
        }
      });

      //Submit button code.
      submitButton.addEventListener("click", function () {
        resultsText = createdGroupRef.querySelector("#" + module_id + "_results_text");

        var keyColorCode = keyDiv.style.backgroundColor
          .substring(
            keyDiv.style.backgroundColor.indexOf("(") + 1,
            keyDiv.style.backgroundColor.lastIndexOf(")")
          )
          .split(", ")
          .map(Number);

        var colorInputValues = [
          colorVal1.value * 2.5,
          colorVal2.value * 2.5,
          colorVal3.value * 2.5,
        ];

        var colorDifference = [
          keyColorCode[0] - colorInputValues[0],
          keyColorCode[1] - colorInputValues[1],
          keyColorCode[2] - colorInputValues[2],
        ];

        var valid = colorDifference.every(
          (el) => el < module_color_01_leniency && el > -module_color_01_leniency
        );
        console.log("colorScore: " + colorDifference);

        if (valid) {
          writeToDatabase("modules/" + module_id + "/isCorrect", true, false);
        } else {
          writeToDatabase("modules/" + module_id + "/isCorrect", false, true);
        }
      });

      //Check for when a field is updated! ==============================================================================================
      module_database_ref = firebase
        .database()
        .ref(databasePrefix + roomcode + "/modules/" + module_id);
      module_database_ref.on("value", function (doc) {
        var moduleData = doc.val();
        if (moduleData == null || moduleData == undefined) return; // This would throw an error and break everything.
        keyDiv.style.backgroundColor = moduleData.keyColor;
      });

      if (host) {
        newColor = randomColor().toString();
        firebase
          .database()
          .ref(databasePrefix + roomcode + "/modules/" + module_id)
          .update({
            keyColor: newColor,
          });
      }
      break;
    case "module_cardswipe_01":
      break;
    default:
      console.error("Unkown group in fullyInitGroup(). groupType: " + groupType);
      break;
  }
}

//UpdateGameVars, used for module timers.
function databaseTextObjects(name, value) {
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/textObjects/" + name)
    .update({
      data: value,
    });
}

//Allows anything to be written into database.
function writeToDatabase(destination, value, resetAfterSend) {
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/" + destination)
    .update(
      {
        data: value,
      },
      (error) => {
        if (error) {
          // The write failed...
        } else {
          if (resetAfterSend) {
            firebase
              .database()
              .ref(databasePrefix + roomcode + "/" + destination)
              .update({
                data: null,
              });
          }
        }
      }
    );
}

// RESTART GAME =======================================================================
//Reset Database and Reset health and tickSpeed (From Losing)
function resetGame() {
  console.log("called reset game");
  document.getElementById("textLayer").innerHTML = "";
  createText("<br>----  DATABASE RESET!  ----");
  document.getElementById("textLayer").innerHTML += "<br>";

  //State
  state = 2;
  databaseSetState(2);

  //firebase.database().ref(databasePrefix + roomcode).set({
  //
  //});

  firebase
    .database()
    .ref(databasePrefix + roomcode + "/modules")
    .set({});
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/objects")
    .set({});
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/textObjects")
    .set({});

  //Reset Modules
  currentModuleNUM = 0;
  updateHeader();

  //Reset module spawn timers
  game_timeTillNextModule = game_timeTillNextModule_default;

  //Reset Timer
  totalSeconds = 0;
  timerActive = true;
  if (host) {
    firebase
      .database()
      .ref(databasePrefix + roomcode + "/data")
      .update({
        _timerCurrent: totalSeconds,
        _moduleTimer: game_timeTillNextModule,
      });
  }

  //RESET HEALTH VARIABLE
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/MainVars/health")
    .update({
      value: defaultHealth,
    });

  //RESET TICKSPEED
  tickSpeed = defaultTickSpeed;
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/MainVars/tickSpeed")
    .update({
      value: tickSpeed,
    });
  setTickSpeed(tickSpeed);
  startGame(true);
}

//Take all inputObjects and set them to default values, then sync it with the database.
function resetInputFields() {
  inputObjects.forEach((objectID) => {
    if (document.getElementById(objectID)) {
      inputObject = document.getElementById(objectID); //Get the coresponding input field.
      switch (inputObject.type) {
        case "range":
          inputObject.value = 0;
          break;
        case "text":
          inputObject.value = "";
          break;
        case "checkbox":
          inputObject.checked = false;
          break;
        case "button":
          break;
        default:
          inputObject.value = "";
          break;
      }

      userUpdateField(objectID);
    }
  });
  removeDeletedInputFields();
}

/**
 * The function removes deleted input fields from the inputObjects array and updates the
 * InputObjectsList element with the updated array.
 */
function removeDeletedInputFields() {
  inputObjects.forEach((objectID) => {
    if (!document.getElementById(objectID)) {
      var inputIndexToRemove = inputObjects.indexOf(objectID);
      inputObjects[inputIndexToRemove] = null;
      inputObjects = inputObjects.filter((n) => n); //Remove null in array
    }
  });
  InputObjectsList = document.getElementById("INPUT_OBJECTS");
  InputObjectsList.innerHTML = "UserInputObjects = " + inputObjects.join(" | ");
}

// MISC ====================================================================================
//Random int with min and max
function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
function randomColor() {
  return (
    "rgb(" +
    randomIntFromInterval(0, 255) +
    ", " +
    randomIntFromInterval(0, 255) +
    ", " +
    randomIntFromInterval(0, 255) +
    ")"
  );
}
function pad(val) {
  var valString = val + "";
  if (valString.length < 2) {
    return "0" + valString;
  } else {
    return valString;
  }
}
//Get date and time
function dateTime(style) {
  var today = new Date();
  var date = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  switch (style) {
    case 1:
      return time;
      break;
    case 2:
      return date;
      break;
    default:
      return date + " " + time;
      break;
  }
}
//Use with "lol".shuffle()
String.prototype.shuffle = function () {
  var a = this.split(""),
    n = a.length;

  for (var i = n - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a.join("");
};
//ShowTextForTime Function
lastShowTextForTimeRan = null;
function showTextForTime(textObject, text, time) {
  var d = new Date();
  var n = d.getTime();
  lastShowTextForTimeRan = n;
  textObject.style.visibility = "visible";
  textObject.innerHTML = text;
  setTimeout(() => {
    if (lastShowTextForTimeRan != n) return;
    textObject.style.visibility = "hidden";
  }, time);
}
function updateColorResult(module_id, groupInDatabase) {
  var moduleReference = document.getElementById(module_id);
  resultsText = moduleReference.querySelector("#" + groupInDatabase + "_results_text");
  userColorDiv = moduleReference.querySelector(
    "#" + groupInDatabase + "_module_colorSwatch_result"
  );
  colorVal1 = moduleReference.querySelector("#" + groupInDatabase + "_input_colorval_01");
  colorVal2 = moduleReference.querySelector("#" + groupInDatabase + "_input_colorval_02");
  colorVal3 = moduleReference.querySelector("#" + groupInDatabase + "_input_colorval_03");
  redVal = (parseInt(colorVal1.value) / 100) * 255;
  greenVal = (parseInt(colorVal2.value) / 100) * 255;
  blueVal = (parseInt(colorVal3.value) / 100) * 255;
  userColorDiv.style.backgroundColor = "rgb(" + redVal + "," + greenVal + "," + blueVal + ")";
}

var cardSwipeBeginTime = null;
function cardswipeSpeedCalc(module_id, groupInDatabase) {
  var moduleReference = document.getElementById(module_id);
  cardSwipeSlider = moduleReference.querySelector("#" + groupInDatabase + "_input_cardSwipe_01");
  if (cardSwipeSlider.value == 0) return;
  if (cardSwipeBeginTime == null) {
    cardSwipeBeginTime = Date.now();
  }
}

/**
 * The function calculates the time difference between the beginning and end of a card swipe and logs
 * it to the console.
 * @param cardswipeSlider - The cardswipeSlider parameter is a reference to a slider element in the
 * HTML document.
 */
function cardswipeSpeedCalcEnd(cardswipeSlider) {
  var cardSwipeRelease = Date.now();
  var cardSwipeTime = parseInt(cardSwipeRelease) - parseInt(cardSwipeBeginTime);
  cardSwipeBeginTime = null;
  cardSwipeRelease = null;
  console.log("Card Swipe Difference: " + cardSwipeTime);
  cardswipeSlider.value = 0;
  userUpdateField(cardswipeSlider.id);
}

//Gets the difference between two JSON objects.
//Returns the difference, uses OBJ2's value.
//Thanks https://stackoverflow.com/questions/8431651/getting-a-diff-of-two-json-objects
function JSONdiff(obj1, obj2) {
  const result = {};
  if (Object.is(obj1, obj2)) {
    return undefined;
  }
  if (!obj2 || typeof obj2 !== "object") {
    return obj2;
  }
  Object.keys(obj1 || {})
    .concat(Object.keys(obj2 || {}))
    .forEach((key) => {
      if (obj2[key] !== obj1[key] && !Object.is(obj1[key], obj2[key])) {
        result[key] = obj2[key];
      }
      if (typeof obj2[key] === "object" && typeof obj1[key] === "object") {
        const value = JSONdiff(obj1[key], obj2[key]);
        if (value !== undefined && value != null && value != {}) {
          result[key] = value;
        }
      }
      if (!result[key] || typeof result[key] !== "object") {
        // Don't touch it.
      } else {
        // The property is an object
        if (Object.keys(result[key]).length === 0) {
          delete result[key]; // The object had no properties, so delete that property
        }
      }
    });
  return result;
}
