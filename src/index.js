import * as firebase from "./firebase.js";
import * as gameData from "./gameData.js";
import * as userDatabaseData from "./userDatabaseData.js";
import * as gameoverScreen from "./gameoverScreen.js";
import * as wordBank from "./wordBank.js";

import * as $ from "jquery";

function changeRoute(e) {
  let hashTag = window.location.hash;
  let pageID = hashTag.replace(`#`, ``);

  if (pageID == ``) {
    pageID = `home`;
  }
  $.get(`pages/${pageID}.html`, function (data) {
    $(`#app`).html(data);
  })
    .done(function () {
      initListenersByPage(pageID);
    })
    .fail(function (error) {
      $(`#app`).html(
        `<!DOCTYPE html><style>.error {padding-top: 100px} .box{margin:0 auto; margin-bottom:100px; border-radius: 20px; background-color:rgba(128,128,128,.356);width:fit-content;padding:10px 24px;width:100%;max-width:500px} .box span{font-family:sans-serif;font-size:15px} .box span{font-size:15px} h1 {margin: 0}</style><div class='error'><div class='box'><h1>Error</h1><p id='errorDetails'></p><p id='errorCode'></p><p><a href="#">Return Home</a><p></div></div>`
      );
      $(`#errorDetails`).html(`The page you are looking for '${pageID}' can not be found.`);
      $(`#errorCode`).html(`${error.status}: ${error.statusText}`);
    })
    .always(function () {
      //Add the active class to anchor tags with the same pageID as an href
      $(`a`).each(function () {
        if ($(this).attr(`href`) == undefined) return;
        let aHref = $(this).attr(`href`).replace(`#`, ``);
        if (aHref == pageID) {
          $(this).addClass(`active`);
        } else {
          $(this).removeClass(`active`);
        }
      });
    });
}

function initURLListener() {
  $(window).on(`hashchange`, changeRoute);
  changeRoute();
}

$(function () {
  initURLListener();
});

function initListenersByPage(pageID) {
  switch (pageID) {
    case "home":
      break;
    default:
      break;
  }
}
