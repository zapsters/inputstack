import "./firebase.js";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  createRoomFunction,
  createAnonymousUser,
  updateUserDisplayName,
  joinRoomFunction,
  signUserOut,
  signUserIn,
  signUserUp,
  checkRequired,
  deleteCurrentUser,
  googlePopup,
} from "./model.js";
import * as $ from "jquery";

import * as alertManager from "./alert.js";
import * as sanitizeHtml from "sanitize-html";

var sanitizeHtmlParams = { allowedTags: [], allowedAttributes: {} };

const auth = getAuth();

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
      $("#creategame_btnid").on("click", async function () {
        try {
          if (auth.currentUser == null) throw new Error("Must be signed in to create a room.");

          if (checkUsernameRequirements($("#name_input").val())) {
            $("#subtext_joingame").html("Creating room...");
            await createRoomFunction();
          } else {
            throw new Error("Username does not meet requirements.");
          }
        } catch (error) {
          $("#subtext_joingame").html(error);
        }
      });
      $("#joingame_btnid").on("click", async function () {
        try {
          $("#subtext_joingame").html("Joining room...");
          if (auth.currentUser == null) {
            await createAnonymousUser($("#name_input").val());
          } else {
            if (auth.currentUser.displayName != $("#name_input").val().toUpperCase()) {
              await updateUserDisplayName($("#name_input").val());
            }
          }

          await joinRoomFunction($("#roomcode_input").val());
        } catch (error) {
          $("#subtext_joingame").html(error);
        }
      });
      break;
    case "signup":
      initTogglePasswordVisibilityListeners();
      initGoogleLoginBtn();
      $("#signUp-submit").on("click", (e) => {
        e.preventDefault();
        var checkRequiredResponse = checkRequired("signUp-form");
        if (checkRequiredResponse[0]) {
          const displayName = $("#signUp-displayName").val();
          const email = $("#signUp-email").val();
          const password = $("#signUp-password").val();
          signUserUp(displayName, email, password);
        } else {
          $("#signUp-statusText").html(checkRequiredResponse[1]);
        }
      });
      break;

    case "signin":
      initTogglePasswordVisibilityListeners();
      initGoogleLoginBtn();

      $("#signIn-submit").on("click", (e) => {
        e.preventDefault();
        var checkRequiredResponse = checkRequired("signIn-form");
        if (checkRequiredResponse[0]) {
          const email = $("#signIn-email").val();
          const password = $("#signIn-password").val();
          signUserIn(email, password);
        } else {
          $("#signIn-statusText").html(checkRequiredResponse[1]);
        }
      });
      break;
    case "account":
      $(".signoutBtn").on("click", (e) => {
        signUserOut();
        window.location = "#signin";
      });
      // console.log(getUserAuth());

      // Listen for the auth to update / load, then fill data
      const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
        if (user) {
          $("#displayNameInput").val(user.displayName);
          $(".displayName").html(user.displayName);
          $("#emailInput").val(user.email);
          $("#passwordInput").val("1234");
          console.log(user);

          unsubscribe();
          // User is signed in
        } else {
          console.log("no user");
          window.location = "#signin";
          unsubscribe();
          // User is signed out
        }
      });

      $("#deleteAccountBtn").on("click", () => {
        // promptForCredentials();
        alertManager.generateModalAlert({
          icon: "downasaur",
          header: "Delete Account?",
          subHeader: `<span class="alert">This is un-reverseable.</span>`,
          buttons: [
            { text: "Cancel" },
            {
              text: "Delete Account",
              class: "dangerous",
              closeModalOnClick: "false",
              onClick: () => {
                deleteCurrentUser();
              },
            },
          ],
        });
      });

      $("#displayNameInput").on("change", function () {
        $(this).val(sanitizeHtml($(this).val(), { allowedTags: [], allowedAttributes: {} }));
      });

      $("#displayNameChangeButton").on("click", () => {
        const auth = getAuth();
        const user = auth.currentUser;

        console.log($("#displayNameInput").val());

        var newName = sanitizeHtmlFunc($("#displayNameInput").val());

        if ($("#displayNameInput").val() != user.displayName) {
          alertManager.generateModalAlert({
            icon: "label",
            header: "Change Display Name?",
            subHeader: `${sanitizeHtmlFunc(user.displayName)} &#8674; ${sanitizeHtmlFunc(newName)}`,
            buttons: [
              { text: "Cancel" },
              {
                text: "Change Name",
                // closeModalOnClick: "false",
                onClick: () => {
                  updateUserDisplayName(sanitizeHtmlFunc(newName), "#displayNameChangeStatusText");
                },
              },
            ],
          });
        } else {
          $("#displayNameChangeStatusText").html(
            "<span>Enter a new display name to change it.</span>"
          );
        }
      });
      $("#passwordChangeButton").on("click", () => {
        const auth = getAuth();
        const user = auth.currentUser;
        alertManager.generateModalAlert({
          icon: "label",
          header: "Change Password",
          bodyText: `For your security, confirm your login details.
            <div class="signIn" style="margin-top: 20px">
              <form action="" id="signIn-form" autocomplete="off" data-np-autofill-form-type="login" data-np-checked="1" data-np-watching="1" class="">
                <div class="input-container">
                  <input required="" type="password" id="changePassword-currentPassword" autocomplete="current-password" data-np-autofill-field-type="password" data-np-uid="24bad00c-c9bf-4240-87d9-fe2ac60fc0ed">
                  <label>Current Password</label>
                  <div class="toggleVisibility">
                    <img src="images/eye-open.svg" alt="" srcset="">
                  </div>
                </div>
                <div class="input-container">
                  <input required="" type="password" id="changePassword-newPassword" autocomplete="current-password" data-np-autofill-field-type="password" data-np-uid="24bad00c-c9bf-4240-87d9-fe2ac60fc0ed">
                  <label>New Password</label>
                  <div class="toggleVisibility">
                    <img src="images/eye-open.svg" alt="" srcset="">
                  </div>
                </div>
                <div class="input-container">
                  <input required="" type="password" id="changePassword-newPasswordSecond" autocomplete="current-password" data-np-autofill-field-type="password" data-np-uid="24bad00c-c9bf-4240-87d9-fe2ac60fc0ed">
                  <label>New Password</label>
                  <div class="toggleVisibility">
                    <img src="images/eye-open.svg" alt="" srcset="">
                  </div>
                </div>
                <span id="signIn-statusText"></span>
                <div class="input-container">
                  <input autocomplete="off" type="submit" id="signIn-submit" value="Sign In">
                </div>
              </form>
              </div>`,
          buttons: [],
        });
        initTogglePasswordVisibilityListeners();

        // alertManager.generateModalAlert({
        //   icon: "label",
        //   header: "Change Password?",
        //   bodyText: `Enter your current password`,
        //   buttons: [
        //     { text: "Cancel" },
        //     {
        //       text: "Change Password",
        //       // closeModalOnClick: "false",
        //       onClick: () => {
        //         alert("logic unfinished");
        //       },
        //     },
        //   ],
        // });
      });
      break;
    default:
      break;
  }
}

export function updateUserState(user) {
  if (user) {
    // User is signed in, see docs for a list of available properties
    // https://firebase.google.com/docs/reference/js/auth.user
    // console.log(user);

    $(".displayName").html(user.displayName);
    $(".loggedOut").css("display", "none");
    $(".loggedIn").css("display", "block");
  } else {
    $("#status").html("not signed in");
    $(".loggedOut").css("display", "block");
    $(".loggedIn").css("display", "none");
  }
}
onAuthStateChanged(auth, (user) => {
  updateUserState(user);
});

// HELPERS ====

function checkUsernameRequirements(input) {
  return input.length < 30 && input.length > 0;
}

function initTogglePasswordVisibilityListeners() {
  $(".toggleVisibility").attr("tabindex", "0");
  $(".toggleVisibility").on("click", function (e) {
    e.preventDefault();
    $(this).toggleClass("visibility");
    if ($(this).hasClass("visibility")) {
      $(this).find("img").attr("src", "images/eye-closed.svg");
      $(this).parent().find("input").attr("type", "text");
    } else {
      $(this).find("img").attr("src", "images/eye-open.svg");
      $(this).parent().find("input").attr("type", "password");
    }
  });
}

function initGoogleLoginBtn() {
  $(".googleSignIn").on("click", function () {
    console.log("Attempting pop up");

    googlePopup();
  });
}

export function sanitizeHtmlFunc(input) {
  return sanitizeHtml(input, sanitizeHtmlParams);
}
