var score = 0;
var userArray = [];

//Game Stats
var totalWordsUnscrambled = 0;
var totalProblemsSolved = 0;
var totalResetBtnClicks = 0;

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
      console.log(player[1].resetButtonClicks);
      totalWordsUnscrambled =
        player[1].wordsUnscrambled + totalWordsUnscrambled;
      totalProblemsSolved = player[1].problemsSolved + totalProblemsSolved;
      totalResetBtnClicks = player[1].resetButtonClicks + totalResetBtnClicks;
      console.log("total " + totalResetBtnClicks);
    });
  });

  console.log("total " + totalResetBtnClicks);
  gameover_scoreText.innerHTML = score;
  gameover_timerText.innerHTML = timerText;
  gameover_moduleCount.innerHTML = currentModuleNUM;
  gameover_totalWordsUnscrambled.innerHTML = totalWordsUnscrambled;
  gameover_totalProblemsSolved.innerHTML = totalProblemsSolved;
  gameover_totalResetBtnClicks.innerHTML = totalResetBtnClicks;
}
