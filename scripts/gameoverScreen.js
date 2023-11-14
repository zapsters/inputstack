var score = 0;
var userArray = [];

//Game Stats
var totalWordsUnscrambled = 0;
var totalProblemsSolved = 0;
var totalResetBtnClicks = 0;

// Player Stats
var resetButtonCamper = "null";

function initializeGameOverScreen() {
  var create_roomcode_ref = firebase
    .database()
    .ref(databasePrefix + roomcode + "/data");
  create_roomcode_ref.once("value", function (doc) {
    create_roomcode_data = doc.val();
    score = create_roomcode_data._timerCurrent;
  });

  users_ref = firebase.database().ref(databasePrefix + roomcode + "/users/");
  users_ref.once("value", function (doc) {
    users_ref = doc.val();
    console.log(users_ref);
    userArray = Object.keys(users_ref).map((key) => [key, users_ref[key]]);
    userArray.forEach((player) => {
      totalWordsUnscrambled += player[1].wordsUnscrambled;
      totalProblemsSolved += player[1].problemsSolved;
      totalResetBtnClicks += player[1].resetButtonClicks;
    });

    gameover_scoreText.innerHTML = score;
    gameover_timerText.innerHTML = timerText;
    gameover_moduleCount.innerHTML = currentModuleNUM;
    gameover_totalWordsUnscrambled.innerHTML = totalWordsUnscrambled;
    gameover_totalProblemsSolved.innerHTML = totalProblemsSolved;
    gameover_totalResetBtnClicks.innerHTML = totalResetBtnClicks;

    gameover_mostActivePlayer.innerHTML = largestUserData(
      userArray,
      "interactions",
      ""
    );
    gameover_wordMaster.innerHTML = largestUserData(
      userArray,
      "wordsUnscrambled",
      "unscrambles"
    );
    gameover_playerResetCamper.innerHTML = largestUserData(
      userArray,
      "resetButtonClicks",
      "clicks"
    );
    gameover_mathGenius.innerHTML = largestUserData(
      userArray,
      "problemsSolved",
      "solves"
    );
    gameover_leastActive.innerHTML = largestUserData(
      userArray,
      "interactions",
      "",
      true
    );
  });
}

var userArray = [
  [
    "user1",
    {
      interactions: 17,
      problemsSolved: 0,
      resetButtonClicks: 17,
      username: "za",
      wordsUnscrambled: 0,
    },
  ],
  [
    "user2",
    {
      interactions: 193,
      problemsSolved: 0,
      resetButtonClicks: 193,
      username: "fffff",
      wordsUnscrambled: 0,
    },
  ],
  [
    "user3",
    {
      interactions: 194,
      problemsSolved: 0,
      resetButtonClicks: 194,
      username: "Kat :D",
      wordsUnscrambled: 0,
    },
  ],
];

function largestUserData(arr, varName, description, reversed) {
  // Initialize maximum element
  arr = userArray;
  var max = arr[0][1][varName];
  var name = arr[0][1].username;

  if (reversed == null) reversed = false;
  // Traverse array elements
  // from second and compare
  // every element with current max
  if (reversed) {
    for (i = 0; i > arr.length; i++) {
      if (arr[i][1][varName] > max) {
        max = arr[i][1][varName];
        name = arr[i][1].username;
      }
    }
  } else {
    for (i = 0; i < arr.length; i++) {
      if (arr[i][1][varName] > max) {
        max = arr[i][1][varName];
        name = arr[i][1].username;
      }
    }
  }
  if (description.length > 0) {
    return name + " with " + max + " " + description;
  } else {
    return name + " with " + max;
  }
}
