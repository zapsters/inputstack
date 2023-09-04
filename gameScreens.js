//Create gameplay screens at different states.
function createGameScreen() {
  switch (state) {
    case 0:
      screen_main_gameplay.style.display = "none";
      screen_joinGame.style.display = "block";
      playerlist_div.style.display = "none";
      gameover_div.style.display = "none";

      break;
    case 1:
      screen_main_gameplay.style.display = "none";
      screen_joinGame.style.display = "none";
      playerlist_div.style.display = "block";
      gameover_div.style.display = "none";
      updateFooter();

      break;
    case 2:
      screen_main_gameplay.style.display = "block";
      screen_joinGame.style.display = "none";
      playerlist_div.style.display = "none";
      gameover_div.style.display = "none";
      resetUserStats();

      break;
    case 3:
      screen_main_gameplay.style.display = "block";
      screen_joinGame.style.display = "none";
      playerlist_div.style.display = "none";

      if (host) {
        gameover_hostOptions.style.display = "block";
        gameover_NotHost.style.display = "none";
      }
      gameover_div.style.display = "block";

      break;
    default:
      console.log("ERROR WITH STATE VAL OF " + state);

      break;
  }
}
