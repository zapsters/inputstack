// Database & Input Object VARIABLES =========================================
var databasePrefix = "InputGame/";
var roomcode = "DEV";
var databaseObjects = [];
var inputObjects = [];

//List of all InputGroups that can be created.
var groupTypeList = [
  "module_simple_01",
  "module_reset_module_01",
  "module_unscramble_01",
  "module_math_01",
];

//Debug Variables
var DEV_showGroupTitles = false;

//References
var healthDiv = document.getElementById("game_health_text");
var timer = document.getElementById("game_gameTimer_text");
var versionText = document.getElementById("versionDiv");

// Game Vars
var version = "Release 1.00 - TESTING 0.10";
var host = false;
var health = 100;
var timerActive = false;
var totalSeconds = 0; //Used for in game realtime timer
var defaultTickSpeed = 1000;
var tickSpeed = defaultTickSpeed;

var groupReferences = []; //References to each group container.
var currentGroups = [];
var groupTypes = [];
var currentModuleNUM = 0;

var isCreatingRoom = false;
var isJoining = false;
var starting = false;
var state = 0;
//State 0: Not in a room
//State 1: In room, wait screen
//State 2: Beginning of game.
//State 3: GameOver screen
createGameScreen();

//GAME VARIABLES =============================================================
var moduleStartCount = 4;
var modules_per_spawnCycle = 2; // # of modules that spawn when the game_timeTillNextModule reaches 0
var game_timeTillNextModule_default = 40; //Seconds between each module spawn
var game_timeTillNextModule;

//MODULE VARIABLES ===========================================================
//module_simple_01
var_simple01_healthPenalty = 1;

//module_reset_module_01
var reset_timer_graceTime = 3; //When to start flashing red.
var_reset_module_01_healthPenalty = 10;
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
  ["2 + 2", "4"],
  ["1 + 2", "3"],
  ["8 * 3", "24"],
  ["200 - 48", "152"],
  ["184 - 73", "111"],
  ["12 x 3", "36"],
  ["93 - 21", "72"],
  ["92 + 3", "95"],
  ["200 / 4", "50"],
  ["100 * 9", "900"],
];

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

    /*
    //Call ONTICK FUNCTIONS
    clearInterval(game_onTick_interval);
    game_onTick_interval = window.setInterval(function () {
      onTick();
    }, tickSpeed);
    */

    //Start Timer!
    timerActive = true;
    clearInterval(game_timer_interval);
    game_timer_interval = window.setInterval(function () {
      timerFunction();
    }, 1000);
  } else {
    timerActive = false;
    clearInterval(game_loop_interval);
    clearInterval(game_onTick_interval);
    clearInterval(game_timer_interval);
  }
}

function timerFunction() {
  if (!host) return;
  if (timerActive) ++totalSeconds;
  secondsText = pad(totalSeconds % 60);
  minutesText = pad(parseInt(totalSeconds / 60));
  if (!timerActive) {
    if (minutesText == "00" && secondsText == "00") {
      timerText = minutesText + ":" + secondsText;
    } else {
      var timerText = "PAUSED -- " + minutesText + ":" + secondsText;
    }
    databaseTextObjects("game_gameTimer_text", timerText);
  } else {
    var timerText = minutesText + ":" + secondsText;
    databaseTextObjects("game_gameTimer_text", timerText);
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
  console.log("running tick function.");
  //HOST MANAGES THE GAME, REST IS FORMATTING.
  groupTypes.forEach(function (value, i) {
    var module_id = "module_" + i;
    var module_type = value;
    switch (value) {
      case "module_simple_01":
        var slider01 = groupReferences[i].querySelector(
          "#" + module_id + "_input_range_01"
        );
        var slider02 = groupReferences[i].querySelector(
          "#" + module_id + "_input_range_02"
        );
        if (host) {
          if (slider01.value <= 0 && slider02.value > 0) {
            console.log("TAKING DAMAGE!");
            takeDamage(var_simple01_healthPenalty);
          }
          if (slider02.value <= 0 && slider01.value > 0) {
            console.log("TAKING DAMAGE!");
            takeDamage(var_simple01_healthPenalty);
          }
          if (slider02.value <= 0 && slider01.value <= 0) {
            console.log("TAKING DAMAGE!");
            takeDamage(var_simple01_healthPenalty * 2);
          }

          slider01.value -= 5;
          userUpdateField(module_id + "_input_range_01");
          slider02.value -= 5;
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
      //
      case "module_reset_module_01":
        timer_current = parseInt(
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML
        );
        //The host will tick down the timer of the module/group.
        if (host) {
          if (timer_current > 0) {
            timer_current--;
            groupReferences[i].querySelector(
              "#" + module_id + "_timer"
            ).innerHTML = timer_current;
            databaseTextObjects(module_id + "_timer", timer_current);
          } else {
            console.log("TAKING DAMAGE!");
            takeDamage(var_reset_module_01_healthPenalty);
          }
        }
        //The module will flash red is low on time.
        if (timer_current > 0) {
          groupReferences[i].querySelector(
            "#" + module_id + "_timer"
          ).style.color = "#000";
          if (timer_current <= reset_timer_graceTime) {
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
        if (host) databaseTextObjects(module_id + "_timer", timer_current);
        break;
      case "module_unscramble_01":
        resultsText = groupReferences[i].querySelector(
          "#" + module_id + "_results_text"
        );
        timer_current = parseInt(
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML
        );

        //The host will tick down the timer of the module/group.
        if (host) {
          if (timer_current > 0) {
            timer_current--;

            groupReferences[i].querySelector(
              "#" + module_id + "_timer"
            ).innerHTML = timer_current;
            databaseTextObjects(module_id + "_timer", timer_current);
          } else {
            timer_current = var_unscramble_timerLength;
            groupReferences[i].querySelector(
              "#" + module_id + "_timer"
            ).innerHTML = var_unscramble_timerLength;
            databaseTextObjects(module_id + "_timer", timer_current);

            if (resultsText.innerHTML != "CORRECT!") {
              console.log("DEALING DAMAGE!");
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
              scrambled_words_list[
                Math.floor(Math.random() * scrambled_words_list.length)
              ];

            writeToDatabase("modules/" + module_id + "/isCorrect", null, false);
            //Scrambledtext.innerHTML = randomWORD;
            databaseTextObjects(ScrambledtextOBJ.id, randomWORD.shuffle());
            databaseTextObjects(UNScrambledtextOBJ.id, randomWORD);
          }
        }

        //The module will flash red is low on time.
        if (timer_current > 0) {
          if (
            timer_current <= unscramble_timer_graceTime &&
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
          inputfield = groupReferences[i].querySelector(
            "#" + module_id + "_input_unscrambledWord"
          );
          inputfield.value = "";
        }

        break;

      case "module_math_01":
        resultsText = groupReferences[i].querySelector(
          "#" + module_id + "_results_text"
        );
        timer_current = parseInt(
          groupReferences[i].querySelector("#" + module_id + "_timer").innerHTML
        );
        //The host will tick down the timer of the module/group.

        if (host) {
          if (timer_current > 0) {
            timer_current--;
            groupReferences[i].querySelector(
              "#" + module_id + "_timer"
            ).innerHTML = timer_current;
            databaseTextObjects(module_id + "_timer", timer_current);
          } else {
            timer_current = var_math_01_timerLength;
            groupReferences[i].querySelector(
              "#" + module_id + "_timer"
            ).innerHTML = var_unscramble_timerLength;
            databaseTextObjects(module_id + "_timer", timer_current);

            if (resultsText.innerHTML != "CORRECT!") {
              console.log("DEALING DAMAGE!");
              takeDamage(var_math_01_healthPenalty);
              resultsText.innerHTML = "";
            } else {
              resultsText.innerHTML = "";
            }

            //GET A NEW PROBLEM
            randomPROBLEM =
              math_problem_list[
                Math.floor(Math.random() * math_problem_list.length)
              ];
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
        }
        //The module will flash red is low on time.
        if (timer_current > 0) {
          if (
            timer_current <= math_01_timer_graceTime &&
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
          inputfield = groupReferences[i].querySelector(
            "#" + module_id + "_input_math_response"
          );
          inputfield.value = "";
          inputfield.disabled = false;
        }

        break;
      default:
        console.log(value + " failed in the ONTICK function.");
        break;
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
console.log(debug_menu);
console.log(document.getElementById("debug_menu_div"));
var debug_menu_text = document.getElementById("debug_menu_text");
var debug_menu_open = false;
if (debug_menu.style.display != "none") debug_menu_open = true;
function toggleDebugMenu() {
  if (debug_menu_open) {
    debug_menu_open = false;
    debug_menu.style.display = "none";
  } else if (!debug_menu_open) {
    debug_menu_open = true;
    debug_menu.style.display = "block";
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
function createroomFunction() {
  if (isCreatingRoom) return;
  username = document.getElementById("username_input").value;
  response_text_obj = document.getElementById("subtext_joingame");
  //Check if username and roomcode are filled out
  if (username == "") {
    showTextForTime(response_text_obj, "ENTER A USERNAME", 1200);
    return;
  }

  var room_to_create = Math.random().toString(20).substr(2, 6);
  document.getElementById("roomcode_input").value = room_to_create;
  create_roomcode_ref = firebase
    .database()
    .ref(databasePrefix + room_to_create + "/users");
  create_roomcode_ref.once("value", function (doc) {
    create_roomcode_data = doc.val();
    if (create_roomcode_data == null) {
      isCreatingRoom = true;
      roomcode = create_roomcode_data;
      showTextForTime(
        response_text_obj,
        "Creating room '" + room_to_create + "'",
        1200
      );
      setTimeout(() => {
        document.getElementById("joingame_btnid").click();
      }, 1000);
      createRoom(room_to_create);
    } else {
      showTextForTime(response_text_obj, "That Room Already Exists", 5000);
      return;
    }
  });
}

//Create room data in the database.
function createRoom(roomcode) {
  console.log("CREATING ROOM!");
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/users")
    .set({
      _usercount: 0,
    });
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/data")
    .update({
      _state: 1,
      _startgame: 0,
      _roomcode_reload: 0,
    });
}

//JOIN GAME BUTTON
function joinroomFunction() {
  if (isJoining) return;
  username = document.getElementById("username_input").value;
  roomcode = document.getElementById("roomcode_input").value;
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
  room_data_ref = firebase.database().ref(databasePrefix + roomcode + "/users");
  room_data_ref.once("value", function (doc) {
    room_data = doc.val();
    roomcode_users_data = doc.val();
    if (room_data != null) {
      isJoining = true;
      showTextForTime(response_text_obj, "Joining Room!", 1200);
      userscount_read = roomcode_users_data._usercount;
      newusercount = userscount_read + 1;
      usernum = newusercount;
      //Writes user info as roomcode/users/user[usernum]
      firebase
        .database()
        .ref(databasePrefix + roomcode + "/users/user" + usernum)
        .set({
          username: username,
        });
      //Adds one to the usercount
      firebase
        .database()
        .ref(databasePrefix + roomcode + "/users/")
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
        state = snapshot.val();
        createGameScreen();
      });

      //Start the check for _roomcode_reload = 1. If it is, quit the game
      roomcode_data_reload_ref = firebase
        .database()
        .ref(databasePrefix + roomcode + "/data/_roomcode_reload");
      roomcode_data_reload_ref.on("value", function (doc) {
        roomcodeReloadval = doc.val();
        if (roomcodeReloadval == "1" || roomcodeReloadval == 1) {
          roomcodeReload();
        }
      });

      //Start to check if Roomcode/users/_usercount is updated. If updated, call the playerlist_reload() function
      roomcode_users_usercount_ref = firebase
        .database()
        .ref(databasePrefix + roomcode + "/users/_usercount");
      roomcode_users_usercount_ref.on("value", function (snapshot) {
        if (state == 1) {
          playerlist_reload();
        }
      });
    } else {
      showTextForTime(response_text_obj, "Room does not exist", 1200);
      return;
    }
  });
}

//Called by all players when _roomcode_reload == 1. Reloads page when the host leaves.
function roomcodeReload() {
  alert("Host left the game... Leaving Room.");
  if (host) {
    deleteRoom(roomcode);
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
    roomcode_users_ref = firebase
      .database()
      .ref(databasePrefix + roomcode + "/users");
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
            roomcode_users_user_username_data =
              roomcode_users_user_data.username;
            usersArray.push(roomcode_users_user_username_data);
            //Create a div with the player's name inside of it
            var node = document.createElement("div");
            var textnode = document.createTextNode(
              roomcode_users_user_username_data
            );
            node.appendChild(textnode);
            document.getElementById("playerlist_li").appendChild(node);
          });
        }
      }
    });
  }
}

// START GAME LOGIC ====================================================================================
function startGame() {
  //Begin the game with default # of modules. (4?)
  setTimeout(function () {
    initializeModuleMultiple(moduleStartCount);
    firebase
      .database()
      .ref(databasePrefix + roomcode + "/data")
      .update({
        _state: state,
      });
  }, 50);

  //Begin gameplay functions
  toggleGameLoop(true);
}

//startGameFunction
//This is called when joining a room and subscribes to the _startgame variable in the database.
function startGameFunction() {
  if (state == 1 && starting == 0) {
    roomcode_data_startgame_ref = firebase
      .database()
      .ref(databasePrefix + roomcode + "/data");
    roomcode_data_startgame_ref.on("value", function (doc) {
      roomcode_data_startgame_data = doc.val();
      roomcode_data_startgame_value = roomcode_data_startgame_data._startgame;
      if (roomcode_data_startgame_value == 1 && starting == 0 && state == 1) {
        starting = 1;
        document.getElementById("subtext2_players").innerHTML =
          "STARTING IN<br>3...";
        setTimeout(function () {
          document.getElementById("subtext2_players").innerHTML =
            "STARTING IN<br>2...";
          setTimeout(function () {
            document.getElementById("subtext2_players").innerHTML =
              "STARTING IN<br>1...";
            setTimeout(function () {
              document.getElementById("subtext2_players").innerHTML =
                "STARTING!<br>";
              setTimeout(function () {
                document.getElementById("playerlist_div").style.display =
                  "none";
                setTimeout(function () {
                  //Ran by everyone to start the game on their end.
                  console.log("STARTING GAME!");
                  if (host) databaseSetState(2);
                  //state = 2;
                  //createGameScreen();
                  initializeGame();
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
    document.getElementById("footer_username").innerHTML =
      "Logged in as: " + username;
    document.getElementById("footer_roomcode").innerHTML =
      "Roomcode: " + roomcode;
    document.getElementById("footer_username").style.display = "block";
    document.getElementById("footer_roomcode").style.display = "block";
    if (host) document.getElementById("footer_host").style.display = "block";
  }
}

// GAME PLAY LOOPS =====================================================
//Called every tickSpeed, deals with Module Spawning.
function gameplay_loop() {
  if (state != 2 || !host) {
    return;
  }

  if (health == 0) {
    gameOver();
  }

  if (game_timeTillNextModule == 0) {
    initializeModuleMultiple(modules_per_spawnCycle);
    game_timeTillNextModule = game_timeTillNextModule_default;
    game_timeTillNextModule_text.innerHTML =
      "Time till next module: " + game_timeTillNextModule;
  } else {
    if (game_timeTillNextModule == null) {
      game_timeTillNextModule = game_timeTillNextModule_default;
    } else {
      game_timeTillNextModule--;
    }
    game_timeTillNextModule_text.innerHTML =
      "Time till next module: " + game_timeTillNextModule;
  }
}

//Update Header and Timer Text
function updateHeader() {
  game_moduleCount_text.innerHTML = "Modules: " + currentModuleNUM;
}

function gameOver() {
  toggleGameLoop(false);
  timerActive = false;
  timerFunction();
  databaseSetState(3);
  createGameScreen();
}

//Health logic
//HOST - takeDamageFunction Can take negative damage to heal.
function takeDamage(amount) {
  if (host) {
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
        easing: "steps(20, end)",
        duration: 70,
        iterationStart: 0,
        playbackRate: 0,
      });
  } else {
    let damageHeaderAnimation = document
      .getElementById("header")
      .animate(
        [{ backgroundColor: flashColor }, { backgroundColor: "white" }],
        {
          fill: "forwards",
          easing: "steps(20, end)",
          duration: 800,
          iterationStart: 0,
          playbackRate: 0,
        }
      );
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

//Used At the start of gameplay to start checking for database updates.
function initializeGame() {
  initInput("input_textbox_01");
  initInput("input_checkbox_01");

  //Call ONTICK FUNCTIONS
  clearInterval(game_onTick_interval);
  game_onTick_interval = window.setInterval(function () {
    onTick();
  }, tickSpeed);

  //CHECKS AND CREATES ANY MODULES IN THE GROUPS FOLDER!!! ===================================
  //Check for when the group folder is updated in the database. ==================
  database_groups_instances_ref = firebase
    .database()
    .ref(databasePrefix + roomcode + "/modules/");
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
      CURRENT_GROUPSDIV.innerHTML =
        "CurrentGroups = " + currentGroups.join(" | ");
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
          //Check if the group already exists, if not...
          groupType = doc.child(groupInDatabase).child("groupType").val();
          createText(
            "# CREATE THE GROUP! TYPE of '<i>" +
              groupType +
              "</i>' as " +
              groupInDatabase
          );

          //CREATING A NEW DIV FROM TEMPLATE
          var templateGroup = document.getElementById("TEMPLATE_" + groupType);
          var createdGroup = templateGroup.cloneNode(true);
          createdGroup.id = "MODULE_ENTRY_" + groupInDatabase;
          createdGroup.querySelector("#DEVtitle").innerHTML = groupType;
          if (!DEV_showGroupTitles) {
            createdGroup.querySelector("#DEVtitle").style.display = "none";
          }
          document.getElementById("moduleContainer").appendChild(createdGroup);
          var children = createdGroup.getElementsByTagName("*");
          for (let i = 0; i < children.length; i++) {
            children[i].id = groupInDatabase + "_" + children[i].id;
          }

          var inputChildren = createdGroup.getElementsByTagName("input");
          for (let i = 0; i < inputChildren.length; i++) {
            initInput(inputChildren[i].id);
          }

          fullyInitGroup(createdGroup, groupInDatabase, groupType);

          groupReferences.push(createdGroup);
          currentGroups.push(groupInDatabase);
          groupTypes.push(groupType);
        }
      });
    }

    //Update current groups DIV.
    CURRENT_GROUPSDIV = document.getElementById("CURRENT_GROUPSDIV");
    CURRENT_GROUPSDIV.innerHTML =
      "CurrentGroups = " + currentGroups.join(" | ");
  });

  //Check for when a field is updated! ==============================================================================================
  database_objects_instances_ref = firebase
    .database()
    .ref(databasePrefix + roomcode + "/objects/");
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
      //Print the object list to the DEV div.
      DEVobjectList = document.getElementById("DATABASE_OBJECTS");
      DEVobjectList.innerHTML = "Updated: " + dateTime(1) + "<br>";

      //Get the element for each entry in the 'objects/' folder.
      inputObjectList.forEach((objectID) => {
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
          //Add object to array, then update list

          DEVobjectList = document.getElementById("DATABASE_OBJECTS");
          DEVobjectList.innerHTML +=
            objectID + " = " + databaseInputValue + "<br>";
        } else {
          alert(objectID + " doesn't exist.");
        }
      });
    }
    DEVobjectList.innerHTML += "<br>" + databaseObjects.join(" | ");
  });

  //Check for when the MainVars folder is updated in the database. ==================
  database_important_vars_ref = firebase
    .database()
    .ref(databasePrefix + roomcode + "/MainVars/");
  database_important_vars_ref.on("value", function (doc) {
    inputData = doc.val();
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
    groupList = Object.keys(doc.val()); //WILL THROW ERROR IF NO DATA IN DATABASE.
    groupList.forEach((textObjectInDatabase) => {
      textObjectData = doc.child(textObjectInDatabase).child("data").val();
      document.getElementById(textObjectInDatabase).innerHTML = textObjectData;
    });
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
    InputObjectsList.innerHTML =
      "UserInputObjects = " + inputObjects.join(" | ");
    //userUpdateField(fieldID);
  } else {
    alert("Problem initInput for " + fieldID + " (Doesn't Exist?)");
  }
}

//Inputs come in groups. This will spawn a group of inputs.
//This will create a new folder in the database with the needed input fields.
function initializeModule(groupType) {
  if (host == false) {
    createText("<b>YOU ARE NOT THE HOST... WHY INITIZALIZEINPUTGROUP()???</b>");
  }
  if (groupType == undefined) {
    //var groupTypeList = ["module_simple_01", "module_reset_module_01"];
    var groupType =
      groupTypeList[Math.floor(Math.random() * groupTypeList.length)];
  }
  var groupID = currentModuleNUM;
  createText(
    "<br>[] initializeModule(" +
      groupType +
      ") " +
      "as module_" +
      groupID +
      " | "
  );
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/modules/" + "module_" + groupID)
    .update({
      groupType: groupType,
    });
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
      break;
    case "module_reset_module_01":
      ResetButton = createdGroupRef.querySelector(
        "#" + module_id + "_input_reset_button"
      );
      ResetButton.addEventListener("click", function () {
        createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML =
          var_reset_timerLength;
        databaseTextObjects(module_id + "_timer", var_reset_timerLength);
        if (createdGroupRef.classList.contains("flashing"))
          createdGroupRef.classList.remove("flashing");
      });
      timer_current = var_reset_timerLength;
      createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML =
        var_reset_timerLength;
      break;
    case "module_unscramble_01":
      //TEXT OBJECT CODE
      ScrambledtextOBJ = createdGroupRef.querySelector(
        "#" + module_id + "_scrambled_word_text"
      );
      UNScrambledtextOBJ = createdGroupRef.querySelector(
        "#" + module_id + "_UNscrambled_word_text"
      );
      resultsText = createdGroupRef.querySelector(
        "#" + module_id + "_results_text"
      );
      inputfield = createdGroupRef.querySelector(
        "#" + module_id + "_input_unscrambledWord"
      );

      timer_current = var_unscramble_timerLength;
      createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML =
        var_unscramble_timerLength;

      //Add event listener for the "isCorrect" var in the database
      unscrambleIsCorrectEvent = firebase
        .database()
        .ref(
          databasePrefix + roomcode + "/modules/" + module_id + "/isCorrect"
        );
      unscrambleIsCorrectEvent.on("value", function (doc) {
        resultsText = createdGroupRef.querySelector(
          "#" + module_id + "_results_text"
        );
        inputfield = createdGroupRef.querySelector(
          "#" + module_id + "_input_unscrambledWord"
        );

        inputData = doc.val();
        isCorrect = doc.child("data").val();
        //console.log(module_id + " trigged isCorrect event, isCorrect is = " + doc.child("data").val());
        if (isCorrect == true) {
          inputfield.disabled = true;
          resultsText.innerHTML = "CORRECT!";
          resultsText.style.color = "green";
        } else if (isCorrect == false) {
          resultsText.innerHTML = "WRONG!";
          setTimeout(function () {
            if (resultsText.innerHTML == "CORRECT!") return;
            resultsText = createdGroupRef.querySelector(
              "#" + module_id + "_results_text"
            );
            resultsText.innerHTML = "";
            inputfield.disabled = false;
          }, 1000);
          resultsText.style.color = "#b50000";
          inputfield.disabled = false;
        } else if (isCorrect == undefined) {
          inputfield.disabled = false;
        }
      });

      if (host) {
        //GET A NEW TEXT
        randomWORD =
          scrambled_words_list[
            Math.floor(Math.random() * scrambled_words_list.length)
          ];
        //Scrambledtext.innerHTML = randomWORD;
        databaseTextObjects(ScrambledtextOBJ.id, randomWORD.shuffle());
        databaseTextObjects(UNScrambledtextOBJ.id, randomWORD);
      }

      //BUTTON
      submitButton = createdGroupRef.querySelector(
        "#" + module_id + "_input_submit_button"
      );
      submitButton.addEventListener("click", function () {
        resultsText = createdGroupRef.querySelector(
          "#" + module_id + "_results_text"
        );
        inputfield = createdGroupRef.querySelector(
          "#" + module_id + "_input_unscrambledWord"
        );
        if (inputfield.value == "") return;
        UNScrambledtextOBJ = createdGroupRef.querySelector(
          "#" + module_id + "_UNscrambled_word_text"
        );
        if (
          inputfield.value.toLowerCase() ==
          UNScrambledtextOBJ.innerHTML.toLowerCase()
        ) {
          writeToDatabase("modules/" + module_id + "/isCorrect", true, false);
          if (createdGroupRef.classList.contains("flashing"))
            createdGroupRef.classList.remove("flashing");
        } else {
          writeToDatabase("modules/" + module_id + "/isCorrect", false, true);
        }
        inputfield.value = "";
        userUpdateField(inputfield.id);
      });

      //WHEN PRESSING ENTER IN INPUT FIELD
      inputfield.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          submitButton = createdGroupRef.querySelector(
            "#" + module_id + "_input_submit_button"
          );
          submitButton.click();
        }
      });
      break;

    case "module_math_01":
      //TEXT OBJECT CODE
      math_question_text = createdGroupRef.querySelector(
        "#" + module_id + "_math_question_text"
      );
      math_answer_text = createdGroupRef.querySelector(
        "#" + module_id + "_math_answer_text"
      );
      resultsText = createdGroupRef.querySelector(
        "#" + module_id + "_results_text"
      );
      inputfield = createdGroupRef.querySelector(
        "#" + module_id + "_input_math_response"
      );

      timer_current = var_math_01_timerLength;
      createdGroupRef.querySelector("#" + module_id + "_timer").innerHTML =
        timer_current;

      //Add event listener for the "isCorrect" var in the database
      mathIsCorrectEvent = firebase
        .database()
        .ref(
          databasePrefix + roomcode + "/modules/" + module_id + "/isCorrect"
        );
      mathIsCorrectEvent.on("value", function (doc) {
        resultsText = createdGroupRef.querySelector(
          "#" + module_id + "_results_text"
        );
        inputfield = createdGroupRef.querySelector(
          "#" + module_id + "_input_math_response"
        );

        inputData = doc.val();
        isCorrect = doc.child("data").val();
        //console.log(module_id + " trigged isCorrect event, isCorrect is = " + doc.child("data").val());
        if (isCorrect == true) {
          inputfield.disabled = true;
          resultsText.innerHTML = "CORRECT!";
          resultsText.style.color = "green";
        } else if (isCorrect == false) {
          resultsText.innerHTML = "WRONG!";
          setTimeout(function () {
            if (resultsText.innerHTML == "CORRECT!") return;
            resultsText = createdGroupRef.querySelector(
              "#" + module_id + "_results_text"
            );
            resultsText.innerHTML = "";
            inputfield.disabled = false;
          }, 1000);
          resultsText.style.color = "#b50000";
          inputfield.disabled = false;
        } else if (isCorrect == undefined) {
          inputfield.disabled = false;
        }
      });

      if (host) {
        //GET A NEW PROBLEM
        randomPROBLEM =
          math_problem_list[
            Math.floor(Math.random() * math_problem_list.length)
          ];

        //SET THE QUESTION TEXT
        databaseTextObjects(math_question_text.id, randomPROBLEM[0]);
        //SET THE ANSWER TEXT
        databaseTextObjects(math_answer_text.id, randomPROBLEM[1]);
      }

      //BUTTON
      submitButton = createdGroupRef.querySelector(
        "#" + module_id + "_input_submit_button"
      );
      submitButton.addEventListener("click", function () {
        resultsText = createdGroupRef.querySelector(
          "#" + module_id + "_results_text"
        );
        inputfield = createdGroupRef.querySelector(
          "#" + module_id + "_input_math_response"
        );
        if (inputfield.value == "") return;
        math_answer_text = createdGroupRef.querySelector(
          "#" + module_id + "_math_answer_text"
        );
        if (
          inputfield.value.toLowerCase() ==
          math_answer_text.innerHTML.toLowerCase()
        ) {
          writeToDatabase("modules/" + module_id + "/isCorrect", true, false);
          if (createdGroupRef.classList.contains("flashing"))
            createdGroupRef.classList.remove("flashing");
        } else {
          writeToDatabase("modules/" + module_id + "/isCorrect", false, true);
        }
        inputfield.value = "";
        userUpdateField(inputfield.id);
      });

      //WHEN PRESSING ENTER IN INPUT FIELD
      inputfield.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          submitButton = createdGroupRef.querySelector(
            "#" + module_id + "_input_submit_button"
          );
          submitButton.click();
        }
      });

      break;
  }
}

//UpdateGameVars, used for timers and other NON-INPORTANT variables to be synced
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

  //Reset Timer
  totalSeconds = 0;
  timerActive = false;
  timerFunction();

  //Reset module spawn timers
  game_timeTillNextModule = game_timeTillNextModule_default;

  //RESET HEALTH VARIABLE
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/MainVars/health")
    .update({
      value: 100,
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
  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  var time =
    today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
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
