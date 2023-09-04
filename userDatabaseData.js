var interactions = 0;
var resetButtonClicks = 0;
var wordsUnscrambled = 0;
var problemsSolved = 0;

function updateUserStats() {
  firebase
    .database()
    .ref(databasePrefix + roomcode + "/users/" + userPath)
    .update({
      interactions: interactions,
      resetButtonClicks: resetButtonClicks,
      wordsUnscrambled: wordsUnscrambled,
      problemsSolved: problemsSolved,
    });
}

function resetUserStats() {
  interactions = 0;
  resetButtonClicks = 0;
  wordsUnscrambled = 0;
  problemsSolved = 0;
  updateUserStats();
}
